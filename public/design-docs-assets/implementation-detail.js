/* An ordered control-flow graph shared by the images and the operation table. */
const implementationLabels = {
    call:'호출', stream:'스트림 준비', append:'목록에 항목 추가', construct:'객체 생성', map:'항목 변환', filter:'항목 필터링', collect:'결과 수집',
    await:'비동기 결과 대기', yield:'값 전달 후 실행 중단', declare:'선언', update:'값 변경',
    return:'반환', 'local-return':'콜백 결과 반환', throw:'예외 발생', break:'반복·분기 종료',
    continue:'다음 반복', jump:'지정 위치 이동', if:'조건 판정', loop:'반복 조건 판정', choose:'분기 선택',
    try:'보호 범위 진입', scope:'범위 진입', callback:'콜백 구성', compute:'값 평가',
    recover:'구문 확인 필요', operation:'처리', dispatch:'예외 유형 판정', resume:'종료 경로 재개',
    'callback-entry':'콜백 실행 진입', 'callback-end':'콜백 종료'
};

const implementationCallErrors=new Map([
    ['accountBookAccessService.validateAccessible','가계부 없음·접근 거부'],
    ['jobs.cancel','가계부 접근 거부·소유자 아님·대상 작업 없음']
]);

function buildImplementationGraph(operations) {
    const nodes=[];
    const create=(op)=>{
        const node={op,edges:[],id:'S'+String(nodes.length+1).padStart(2,'0')};
        nodes.push(node);return node;
    };
    const synthetic=(kind,subject,value,op)=>[kind,subject,value,op[3],op[4]];
    function prepare(list) {
        return list.map(op=>{
            const node=create(op);
            const [kind,,,,,meta={}]=op;
            const sections={};
            for(const key of ['test','yes','no','body','update','otherwise','finish']) {
                if(meta[key]) sections[key]=prepare(meta[key]);
            }
            if(meta.cases) sections.cases=meta.cases.map(([label,steps,isDefault,fallthrough])=>({
                label,steps:prepare(steps),isDefault,fallthrough
            }));
            if(meta.handlers) {
                if(meta.handlers.length) sections.dispatch=create(synthetic('dispatch','예외 유형 판정','선언된 처리절 순서',op));
                sections.handlers=meta.handlers.map(([label,steps])=>({label,steps:prepare(steps)}));
            }
            if(sections.finish?.length) sections.resume=create(synthetic('resume','종료 경로 재개','저장된 목적지',op));
            if(meta.callbacks||kind==='callback') {
                const blocks=meta.callbacks??[['콜백',meta.body??[]]];
                sections.callbacks=blocks.map(([label,steps])=>({
                    label,entry:create(synthetic('callback-entry',label,'호출 시점',op)),
                    steps:kind==='callback'?sections.body:prepare(steps),
                    end:create(synthetic('callback-end','','호출자 복귀',op))
                }));
            }
            return {node,meta,...sections};
        });
    }
    const root=prepare(operations);
    const end={id:'종료'}, returned={id:'함수 반환'}, thrown={id:'예외 전파'},
        callbackEnd={id:'호출자 복귀'}, runtime={id:'실행 시점 결정'};
    const throwKinds=new Set(['call','stream','append','construct','map','filter','collect','await','operation','compute','assign','update','if','loop','choose']);
    const add=(node,label,destination)=>{
        destination?.register?.();
        node.edges.push({label,...(destination?.to?destination:{to:destination??runtime})});
    };
    const flow=(items=[],next,context)=>items.reduceRight((destination,entry)=>wire(entry,destination,context),next);
    function wire(entry,next,context) {
        const {node,meta}=entry;
        const [kind,subject,value]=node.op;
        let start=node;
        switch(kind) {
        case 'if':
            add(node,'충족',flow(entry.yes,next,context));
            add(node,'불충족',flow(entry.no,next,context));
            break;
        case 'loop': {
            const test=flow(entry.test,node,context);
            const update=flow(entry.update,test,context);
            const inside={...context,break:next,continue:update};
            const body=flow(entry.body,update,inside);
            add(node,'충족',body);
            if(value!=='항상 참') add(node,'불충족',flow(entry.otherwise,next,context));
            start=meta.post?body:test;
            break;
        }
        case 'choose': {
            const inside={...context,break:next};
            let following=next;
            const targets=entry.cases.map(arm=>({...arm})).reverse().map(arm=>{
                const target=flow(arm.steps,arm.fallthrough?following:next,inside);
                following=target;return {...arm,target};
            }).reverse();
            for(const arm of targets) add(node,arm.label,arm.target);
            if(!targets.some(arm=>arm.isDefault)) add(node,'일치 항목 없음',next);
            break;
        }
        case 'try':
        case 'scope': {
            let inside={...context};
            let after=next;
            if(entry.resume) {
                const cleanup=flow(entry.finish,entry.resume,context);
                const through=destination=>{
                    const saved=destination?.to?destination:{to:destination};
                    if(!entry.resume.edges.some(edge=>edge.to===saved.to&&edge.note===saved.note))
                        add(entry.resume,saved.to.id,saved);
                    return {to:cleanup,note:'정리 후 '+saved.to.id+(saved.note?' · '+saved.note:'')};
                };
                after=through(next);
                for(const key of ['return','throw','break','continue','local','jump']) {
                    const destination=context[key]??runtime;
                    const finalTarget=destination.to??destination;
                    inside[key]={to:cleanup,note:'정리 후 '+finalTarget.id+(destination.note?' · '+destination.note:''),
                        register:()=>through(destination)};
                }
            }
            let bodyContext=inside;
            if(entry.dispatch) {
                for(const handler of entry.handlers) add(entry.dispatch,handler.label,flow(handler.steps,after,inside));
                add(entry.dispatch,'해당 유형 없음',inside.throw);
                bodyContext={...inside,throw:entry.dispatch};
            }
            const completed=flow(entry.otherwise,after,inside);
            add(node,entry.body?'범위 본문':'완료',flow(entry.body,completed,bodyContext));
            break;
        }
        case 'return':add(node,'값 반환',context.return);break;
        case 'local-return':add(node,'콜백 복귀',context.local);break;
        case 'throw':add(node,'예외',context.throw);break;
        case 'break':
        case 'continue':add(node,'이동',value?context.jump:context[kind]);break;
        case 'jump':add(node,'이동',context.jump);break;
        default:add(node,kind==='yield'?'재개':'다음',next);
        }
        const knownFailure=implementationCallErrors.get(subject);
        if(throwKinds.has(kind)&&context.throw!==thrown) add(node,knownFailure??'실행 중 예외',context.throw);
        else if(kind==='call'&&knownFailure) add(node,knownFailure,context.throw);
        for(const block of entry.callbacks??[]) {
            const callbackContext={return:block.end,local:block.end,throw:thrown,break:runtime,continue:runtime,jump:runtime};
            add(node,block.label,block.entry);
            add(block.entry,'호출 시',flow(block.steps,block.end,callbackContext));
            add(block.end,'완료',callbackEnd);
        }
        return start;
    }
    const start=flow(root,end,{return:returned,local:returned,throw:thrown,break:runtime,continue:runtime,jump:runtime});
    return {nodes,start};
}

const implementationCallNames=new Map([
    ['validateAccessible','가계부 접근 권한 확인'],
    ['findByAccountBookIdAndActiveTrueOrderByDisplayOrderAscNameAsc','활성 가계부 분류 조회'],
    ['AccountBookCategoryResponseDto.from','분류 응답 변환'],
    ['user.getId','요청 사용자 ID 조회'],
    ['userPrincipal.getId','요청 사용자 ID 조회'],
    ['ResponseUtil.ok','성공 응답 구성'],
    ['jobs.cancel','소비 분석 작업 취소']
]);

function operationName([kind,subject,,,,meta={}]) {
    if(kind==='assign') {
        const mode=meta.mode;
        return subject+' '+(mode==='초기값'?'초기화':mode==='반복 변수 대입'?'대입':mode||'대입');
    }
    if(kind==='call') return implementationCallNames.get(subject) ??
        implementationCallNames.get(subject.split('.').at(-1)) ?? (callAction(subject)||'함수 호출');
    if(kind==='stream') return '스트림 준비';
    if(kind==='map') return '항목 변환';
    if(kind==='filter') return '항목 필터링';
    if(kind==='collect'&&/^[a-zA-Z._]+$/.test(subject)) return '결과 수집';
    if(kind==='construct') return subject.split('.').at(-1)+' 객체 생성';
    if(kind==='return'||kind==='local-return'||kind==='throw') return implementationLabels[kind];
    if(kind==='operation'&&/^[a-z_]+$/.test(subject)) return '표현식 평가';
    if(kind==='recover') return '구문 확인 필요';
    return kind==='declare'?subject+' 선언':kind==='update'?subject+' '+(meta.mode||'값 변경'):
        subject||implementationLabels[kind]||'처리';
}

function operationDetails([kind,subject,value,,,meta={}]) {
    const tokens=[value];
    if(kind==='throw'&&value) tokens[0]=value+' 예외';
    if(['call','construct','map','filter','collect'].includes(kind)) {
        tokens.unshift(subject);
        if(!value) tokens.push('인자 없음');
        if(subject==='accountBookCategoryRepository.findByAccountBookIdAndActiveTrueOrderByDisplayOrderAscNameAsc')
            tokens.push('활성 분류만 조회 · 표시 순서 오름차순 · 같은 표시 순서에서는 이름 오름차순');
    }
    if(kind==='return'&&!value) tokens.push('전달값 없음');
    if(kind==='if') tokens.push('조건 충족 여부');
    if(meta.label) tokens.push('복귀 대상 '+meta.label);
    if(kind==='callback-entry') tokens.push('등록된 호출 경로');
    if(kind==='recover') tokens.unshift(subject);
    if(!tokens.some(Boolean)) tokens.push(meta.mode||implementationLabels[kind]||'본문 처리');
    return tokens.filter(Boolean);
}

function implementationDetail(graphData,fn) {
    const [operations,warning,sourceReview]=graphData;
    const {nodes,start}=buildImplementationGraph(operations);
    const graphId=fn.id;
    const head='<h2>구현 상세 흐름도</h2>';
    if(!nodes.length) return head+(warning?
        '<p class="notice">파서가 실행 본문을 식별하지 못했습니다. 소스 근거에서 본문을 확인할 수 있습니다.</p>':
        '<p>실행 단계가 없는 본문입니다.</p><figure class="diagram" data-implementation="[]" data-alt="시작 후 종료"></figure>');
    const position=([line,col])=>line+':'+col;
    const target=(id)=>/^S\d+$/.test(id)?
        `<a href="#flow-${graphId}-${id}" data-flow-target="${escapeHtml(id)}">${escapeHtml(id)}</a>`:
        escapeHtml(id);
    const linksByName=new Map();
    for(const [raw,line,confidence,targets] of fn.calls??[]) {
        if(confidence!=='scope'||targets.length!==1) continue;
        const name=raw.split(/[.>:]/).at(-1);
        linksByName.set(line+' '+name,targets[0]);
    }
    function operationRow(node) {
        const [kind,subject,,sourceStart,sourceEnd]=node.op;
        let related=linksByName.get(sourceStart[0]+' '+subject.split('.').at(-1));
        if(!related&&kind==='call'&&/^[A-Z]\w*\.\w+$/.test(subject)&&fn.file) {
            const [owner,method]=subject.split('.');
            const sameService=index.functions.filter(([id,name,scope])=>{
                const target=files.get(id.split('-')[0]);
                return name===method&&scope.split('.').at(-1)===owner&&target.project===fn.file.project&&
                    target.service===fn.file.service;
            });
            if(sameService.length===1) related=sameService[0][0];
        }
        const evidence=position(sourceStart)+(sourceEnd[0]!==sourceStart[0]?'–'+position(sourceEnd):'');
        const value=operationDetails(node.op).map(value=>`<code>${escapeHtml(value)}</code>`).join('<br>');
        const routes=node.edges.map(edge=>`<li>${escapeHtml(edge.label)} → ${target(edge.to.id)}${edge.note?' · '+escapeHtml(edge.note):''}</li>`).join('');
        return `<tr id="flow-${graphId}-${node.id}"><th scope="row">${node.id}</th><td>${escapeHtml(operationName(node.op))}</td><td>${value}${related?'<br>'+functionLink(related):''}</td><td><ul>${routes}</ul></td><td class="flow-source">${evidence}</td></tr>`;
    }
    // ステップ番号を翻訳対象の案内文から分離する。
    const intro=`<p><span>진입 단계</span> ${target(start.id)} · <span>처리 단계</span> ${nodes.length.toLocaleString()}.
        <span>단계 표에서 조건과 값을 확인하고, 다음 단계 번호를 누르면 해당 구간이 열립니다.</span></p>`;
    const panels=[];
    for(let start=0;start<nodes.length;) {
        const chunk=[];
        let weight=0;
        for(;start<nodes.length;start++) {
            const node=nodes[start];
            const size=Math.max(1,Math.ceil(node.edges.length/2));
            if(weight+size>10&&chunk.length) break;
            chunk.push(node);weight+=size;
        }
        const low=chunk[0].id,high=chunk.at(-1).id;
        const ranges=low===high?low:low+'–'+high;
        const data=chunk.map(node=>[node.id,node.op[0],operationName(node.op).replace(/\s+/g,' '),
            node.edges.map(edge=>[edge.label,edge.to.id]),
            node.op[1]==='ResponseUtil.ok'&&node.op[2]?'처리 결과의 응답 본문 포함':node.op[2]]);
        panels.push(`<details class="implementation-panel" data-deferred-diagrams${panels.length?'':' open'}><summary>${ranges} · ${escapeHtml(operationName(chunk[0].op))}</summary>
            <figure class="diagram" data-implementation="${escapeHtml(JSON.stringify(data))}" data-alt="${ranges} 구현 상세 흐름도"></figure>
            <div class="table implementation-table"><table><thead><tr><th scope="col">단계</th><th scope="col">처리</th><th scope="col">조건·값·인자</th><th scope="col">다음 단계</th><th scope="col">줄:열</th></tr></thead>
            <tbody>${chunk.map(operationRow).join('')}</tbody></table></div></details>`);
    }
    return head+intro+(sourceReview?'<p class="meta">본문 대조 · '+escapeHtml(sourceReview)+'</p>':'')+(warning?'<p class="notice">일부 구문에 복구 표시가 있습니다. 해당 단계의 실행 의미는 소스 대조가 필요합니다.</p>':'')+panels.join('');
}

// 各ステップと分岐の文言を先に測り、連結位置と画像の高さを求める。
function implementationPng(rows) {
    const width=786;
    const nodeX=24, nodeWidth=326, branchX=414, branchWidth=348;
    const nodePadding=24, idWidth=46, rowGap=25;
    const centerX=nodeX+nodeWidth/2;
    const layout=diagramTextLayout(designI18n.language);
    const translated=(text,max,size,weight)=>layout(designI18n.translate(String(text)),max,size,weight);
    const empty=translated('시작 → 종료',224,16,700);
    const decisions=new Set(['if','loop','choose','dispatch','resume']);
    const terminals=new Set(['return','local-return','throw','break','continue','jump','callback-end']);

    // 左のステップと右の分岐は、行数に応じてそれぞれ高さを決める。
    const steps=rows.map(([id,kind,name,edges,value],index)=>{
        const next=rows[index+1]?.[0];
        const title=translated(name,nodeWidth-2*nodePadding-idWidth,15,700);
        const detail=value?translated(value,nodeWidth-2*nodePadding,13,500):null;
        const nodeHeight=26+title.height+(detail?6+detail.height:0);
        const exits=edges.filter(([label,target])=>label!=='다음'||target!==next).map(([label,target])=>{
            const condition=translated(label,196,13,600);
            const destination=translated(target,116,13,700);
            const height=12+Math.max(condition.height,destination.height);
            return {condition,destination,height,exception:label.includes('예외')||target==='예외 전파'};
        });
        const branchHeight=exits.reduce((height,exit)=>height+exit.height+8,0)-8;
        const contentHeight=Math.max(nodeHeight,branchHeight);
        return {id,kind,title,detail,nodeHeight,exits,branchHeight,contentHeight,
            direct:edges.some(([label,target])=>label==='다음'&&target===next)};
    });
    const height=steps.length?48+steps.reduce((sum,step)=>sum+step.contentHeight,0)+rowGap*(steps.length-1):
        empty.height+58;
    const {ctx,finish}=diagramCanvas(width,height);
    ctx.lineWidth=1.3;

    // 矢印は計測済みのボックスの中心や端を結ぶ。
    const path=(points,arrow=false)=>{
        ctx.strokeStyle=diagramColors.connector;
        ctx.fillStyle=diagramColors.connector;
        ctx.beginPath();
        ctx.moveTo(...points[0]);
        for(const point of points.slice(1)) ctx.lineTo(...point);
        ctx.stroke();
        if(!arrow) return;
        const [x,y]=points.at(-1), [previousX,previousY]=points.at(-2);
        const angle=Math.atan2(y-previousY,x-previousX);
        ctx.beginPath();
        ctx.moveTo(x,y);
        for(const sign of [-1,1]) ctx.lineTo(x-7*Math.cos(angle+sign*.49),y-7*Math.sin(angle+sign*.49));
        ctx.closePath();
        ctx.fill();
    };

    if(!steps.length) {
        diagramCard(ctx,width/2-128,18,256,empty.height+20,diagramColors.success,diagramColors.border,22);
        drawDiagramText(ctx,empty,width/2,28,diagramColors.ink,'center');
    }
    let y=24;
    for(const step of steps) {
        const {id,kind,title,detail,nodeHeight,exits,branchHeight,contentHeight,direct}=step;
        const center=y+nodeHeight/2;
        const decision=decisions.has(kind);
        const fill=kind==='throw'?diagramColors.failure:terminals.has(kind)?diagramColors.success:
            decision?diagramColors.decision:'#ffffff';
        const nextY=y+contentHeight+rowGap;
        if(direct) path([[centerX,y+nodeHeight],[centerX,nextY]],true);

        // 長い条件や遷移先も折り返し、分岐同士の間隔を確保する。
        if(exits.length) {
            let branchY=y+Math.max(0,(nodeHeight-branchHeight)/2);
            const centers=exits.map(exit=>{
                const at=branchY+exit.height/2;
                branchY+=exit.height+8;
                return at;
            });
            const spine=branchX-24;
            path([[nodeX+nodeWidth,center],[spine,center]]);
            path([[spine,Math.min(center,centers[0])],[spine,Math.max(center,centers.at(-1))]]);
            exits.forEach(({condition,destination,height,exception},index)=>{
                const at=centers[index];
                path([[spine,at],[branchX,at]],true);
                diagramCard(ctx,branchX,at-height/2,branchWidth,height,exception?diagramColors.failure:'#f1f6f7',
                    exception?'#e6c8c0':'#cadbde',6);
                drawDiagramText(ctx,condition,branchX+12,at-condition.height/2,diagramColors.ink);
                drawDiagramText(ctx,destination,branchX+220,at-destination.height/2,
                    exception?diagramColors.failureInk:'#215a60');
            });
        }

        if(decision) {
            const corner=13, right=nodeX+nodeWidth;
            ctx.beginPath();
            ctx.moveTo(nodeX,center);
            ctx.lineTo(nodeX+corner,y);
            ctx.lineTo(right-corner,y);
            ctx.lineTo(right,center);
            ctx.lineTo(right-corner,y+nodeHeight);
            ctx.lineTo(nodeX+corner,y+nodeHeight);
            ctx.closePath();
            ctx.strokeStyle=diagramColors.decisionBorder;
            ctx.fillStyle=fill;
            ctx.fill();
            ctx.stroke();
        } else {
            diagramCard(ctx,nodeX,y,nodeWidth,nodeHeight,fill,kind==='throw'?'#e3bdb4':diagramColors.border,
                terminals.has(kind)?20:9);
        }
        drawDiagramText(ctx,layout(id,idWidth,12,700),nodeX+nodePadding,y+14,'#326169');
        drawDiagramText(ctx,title,nodeX+nodePadding+idWidth,y+13,diagramColors.ink);
        if(detail) drawDiagramText(ctx,detail,nodeX+nodePadding,y+19+title.height,'#41616a');
        y=nextY;
    }
    return finish();
}

