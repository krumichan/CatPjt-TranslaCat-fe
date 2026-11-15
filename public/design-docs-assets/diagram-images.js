'use strict';

const diagramColors={
    canvas:'#fcfdfd',ink:'#193139',connector:'#536f77',border:'#99b5b3',
    decision:'#eaf3fa',decisionBorder:'#8aaebf',success:'#e2f4ed',successInk:'#18483e',
    failure:'#fbeeed',failureInk:'#803d32',
};

function styleDiagram(graphic,kind) {
    const css=graphic.ownerDocument.createElementNS('http://www.w3.org/2000/svg','style');
    css.textContent=`
        .node rect,.actor,.labelBox,.note {rx:8px;ry:8px}
        .node .label-container,.node polygon,.node path,.entityBox,.actor {stroke-width:1.35px}
        .node .nodeLabel {font-weight:550}
        .flowchart-link,.transition,.relationshipLine {stroke-width:1.65px;stroke-linejoin:round;stroke-linecap:round}
        .edgeLabel text,.edgeLabel tspan,.edgeTerminals text,.relationshipLabel {
            paint-order:stroke fill;stroke:${diagramColors.canvas};stroke-width:5px;stroke-linejoin:round;
            font-weight:650;fill:${diagramColors.ink}
        }
        .edgeLabel rect,.labelBkg {fill:${diagramColors.canvas};rx:5px;ry:5px}
        .actor-line {stroke-width:1.1px;stroke-dasharray:4 5}
        .messageLine0,.messageLine1 {stroke-width:1.5px;stroke-linecap:round}
        .loopLine {stroke-width:1.1px}
        .entityBox,.attributeBoxEven,.attributeBoxOdd,.relationshipLabelBox {stroke-width:1.2px}
    `;
    if(kind==='flowchart') {
        css.textContent+=`
            .node polygon {stroke-linejoin:round}
            .node:not(.terminal):not(.failure) polygon.label-container {
                fill:${diagramColors.decision};stroke:${diagramColors.decisionBorder}
            }
        `;
    }
    graphic.append(css);
}

// ラスタライズ前にラベルの実寸を確認し、SVGの描画範囲に含める。
function fitDiagramViewBox(graphic) {
    const {x,y,width,height}=graphic.viewBox.baseVal;
    if(!(width>0&&height>0)) throw new Error('그림의 크기를 확인할 수 없습니다.');
    let left=x,top=y,right=x+width,bottom=y+height;
    graphic.setAttribute('width',String(width));
    graphic.setAttribute('height',String(height));
    graphic.style.removeProperty('max-width');
    const host=document.createElement('div');
    host.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
    host.append(graphic);
    document.body.append(host);
    try {
        const inverse=graphic.getCTM().inverse();
        for(const label of graphic.querySelectorAll('text')) {
            const box=label.getBBox();
            if(!box.width||!box.height) continue;
            const matrix=inverse.multiply(label.getCTM());
            for(const px of [box.x,box.x+box.width]) {
                for(const py of [box.y,box.y+box.height]) {
                    const point=new DOMPoint(px,py).matrixTransform(matrix);
                    left=Math.min(left,point.x);
                    top=Math.min(top,point.y);
                    right=Math.max(right,point.x);
                    bottom=Math.max(bottom,point.y);
                }
            }
        }
    } finally {
        host.remove();
    }
    const padding=8;
    const bounds=[left-padding,top-padding,right-left+padding*2,bottom-top+padding*2];
    graphic.setAttribute('viewBox',bounds.join(' '));
    graphic.setAttribute('width',String(bounds[2]));
    graphic.setAttribute('height',String(bounds[3]));
    return {width:bounds[2],height:bounds[3]};
}

async function diagramPng(svg,kind) {
    const graphic=new DOMParser().parseFromString(svg,'image/svg+xml').documentElement;
    styleDiagram(graphic,kind);
    const {width,height}=fitDiagramViewBox(graphic);
    const encoded='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(graphic));
    const vector=new Image();
    vector.src=encoded;
    await vector.decode();

    const scale=Math.min(2.25,12000/width,12000/height,Math.sqrt(16000000/(width*height)));
    const canvas=document.createElement('canvas');
    canvas.width=Math.ceil(width*scale);
    canvas.height=Math.ceil(height*scale);
    const context=canvas.getContext('2d');
    context.fillStyle=diagramColors.canvas;
    context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(vector,0,0,canvas.width,canvas.height);
    return {url:canvas.toDataURL('image/png'),width,height};
}

// 表示寸法を保ちながら、PNGのピクセル数をブラウザーの上限内に収める。
function diagramCanvas(width,height) {
    const canvas=document.createElement('canvas');
    const scale=Math.min(2,12000/width,12000/height,Math.sqrt(16000000/(width*height)));
    canvas.width=Math.ceil(width*scale);
    canvas.height=Math.ceil(height*scale);
    const ctx=canvas.getContext('2d');
    ctx.scale(scale,scale);
    ctx.fillStyle=diagramColors.canvas;
    ctx.fillRect(0,0,width,height);
    return {ctx,finish:()=>({url:canvas.toDataURL('image/png'),width,height})};
}

const diagramFont='"Source Sans 3", "Yu Gothic UI", "Malgun Gothic", sans-serif';

// 翻訳後の幅を測り、単語が収まらない場合は書記素の境界で折り返す。
function diagramTextLayout(locale) {
    const measure=document.createElement('canvas').getContext('2d');
    const words=new Intl.Segmenter(locale,{granularity:'word'});
    const graphemes=new Intl.Segmenter(locale,{granularity:'grapheme'});

    return (text,width,size,weight)=>{
        const font=`${weight} ${size}px ${diagramFont}`;
        measure.font=font;
        const lines=[];
        for(const paragraph of String(text??'').split(/\r?\n/)) {
            let line='';
            for(const {segment} of words.segment(paragraph)) {
                if(line&&measure.measureText(line+segment).width>width) {
                    lines.push(line);
                    line='';
                }
                if(measure.measureText(segment).width<=width) {
                    line+=segment;
                    continue;
                }
                for(const {segment:character} of graphemes.segment(segment)) {
                    if(line&&measure.measureText(line+character).width>width) {
                        lines.push(line);
                        line='';
                    }
                    line+=character;
                }
            }
            lines.push(line);
        }
        const lineHeight=Math.ceil(size*1.4);
        return {font,lines,lineHeight,height:lineHeight*lines.length};
    };
}

// 計測時と同じ書体で各行を描画する。xは指定した揃え位置、yは行ブロックの上端。
function drawDiagramText(ctx,layout,x,y,color,align='left') {
    ctx.font=layout.font;
    ctx.textAlign=align;
    ctx.textBaseline='middle';
    ctx.fillStyle=color;
    for(const [index,line] of layout.lines.entries()) {
        ctx.fillText(line,x,y+(index+.5)*layout.lineHeight);
    }
}

function diagramCard(ctx,x,y,width,height,fill,border,radius=8) {
    ctx.beginPath();
    ctx.roundRect(x,y,width,height,radius);
    ctx.fillStyle=fill;
    ctx.fill();
    ctx.strokeStyle=border;
    ctx.stroke();
}

// 分岐ごとにカードを配置し、現在の言語でPNGを生成する。
function flowLanesPng({start,lanes}) {
    const cardWidth=designI18n.language==='en'?258:232;
    const gap=22,inset=20,inner=11,resultGap=10;
    const boxWidth=cardWidth-inner*2;
    const width=inset*2+lanes.length*cardWidth+(lanes.length-1)*gap;
    const layout=diagramTextLayout(designI18n.language);
    const startWidth=Math.min(width-inset*2,370);
    const startLabel=layout(start,startWidth-28,17,700);
    const startHeight=startLabel.height+22;
    const splitY=inset+startHeight+25;
    const laneY=splitY+23;
    const columns=lanes.map((lane,index)=>{
        const left=inset+index*(cardWidth+gap);
        const resultWidth=(boxWidth-(lane.results.length-1)*resultGap)/lane.results.length;
        return {
            left,center:left+cardWidth/2,resultWidth,
            title:layout(lane.title,boxWidth-24,16,700),
            steps:lane.steps.map(([action,detail])=>{
                const primary=layout(action,boxWidth-24,16,700);
                const secondary=detail?layout(detail,boxWidth-24,13,500):null;
                return {primary,secondary,height:primary.height+(secondary?secondary.height+4:0)+20};
            }),
            results:lane.results.map(([label,good],offset)=>({
                good,center:left+inner+resultWidth/2+offset*(resultWidth+resultGap),
                state:layout(designI18n.translate(good?'성공':'실패'),resultWidth-16,12,700),
                detail:layout(label,resultWidth-16,13,550),
            })),
        };
    });
    const headerHeight=Math.max(...columns.map(lane=>lane.title.height))+20;
    const stepCount=Math.max(...columns.map(lane=>lane.steps.length));
    const headerEnd=laneY+inner+headerHeight;
    let cursor=headerEnd;
    const stepTops=Array.from({length:stepCount},(_,index)=>{
        const top=cursor+20;
        cursor=top+Math.max(...columns.map(lane=>lane.steps[index]?.height??0));
        return top;
    });
    const resultY=cursor+38;
    const resultHeight=Math.max(0,...columns.flatMap(lane=>
        lane.results.map(result=>result.state.height+result.detail.height+20)));
    const height=resultY+resultHeight+inner+inset;
    const {ctx,finish}=diagramCanvas(width,height);
    const label=(text,x,y,color)=>drawDiagramText(ctx,text,x,y,color,'center');
    function line(points,arrow=false) {
        ctx.beginPath();
        ctx.strokeStyle=diagramColors.connector;
        ctx.lineWidth=1.6;
        ctx.lineJoin='round';
        ctx.moveTo(...points[0]);
        for(const point of points.slice(1)) ctx.lineTo(...point);
        ctx.stroke();
        if(!arrow) return;
        const [x,y]=points.at(-1);
        ctx.beginPath();
        ctx.moveTo(x-4,y-7);
        ctx.lineTo(x,y);
        ctx.lineTo(x+4,y-7);
        ctx.closePath();
        ctx.fillStyle=diagramColors.connector;
        ctx.fill();
    }
    const middle=width/2;
    diagramCard(ctx,middle-startWidth/2,inset,startWidth,startHeight,diagramColors.success,diagramColors.border,22);
    label(startLabel,middle,inset+11,diagramColors.ink);
    line([[middle,inset+startHeight],[middle,splitY]]);
    line([[columns[0].center,splitY],[columns.at(-1).center,splitY]]);
    for(const {left,center,title,steps,results,resultWidth} of columns) {
        line([[center,splitY],[center,laneY]],true);
        diagramCard(ctx,left,laneY,cardWidth,height-inset-laneY,'#f3f8f8','#dbe7e7',11);
        diagramCard(ctx,left+inner,laneY+inner,boxWidth,headerHeight,diagramColors.decision,'#d3e3eb',7);
        label(title,center,laneY+inner+(headerHeight-title.height)/2,diagramColors.ink);
        let previous=headerEnd;
        for(const [index,{primary,secondary,height:stepHeight}] of steps.entries()) {
            const y=stepTops[index];
            line([[center,previous],[center,y]],true);
            diagramCard(ctx,left+inner,y,boxWidth,stepHeight,'#ffffff',diagramColors.border);
            label(primary,center,y+10,diagramColors.ink);
            if(secondary) label(secondary,center,y+14+primary.height,'#41606a');
            previous=y+stepHeight;
        }
        if(!results.length) continue;
        const branchY=resultY-18;
        line([[center,previous],[center,branchY]]);
        line([[results[0].center,branchY],[results.at(-1).center,branchY]]);
        for(const {center:resultCenter,good,state,detail} of results) {
            const ink=good?diagramColors.successInk:diagramColors.failureInk;
            line([[resultCenter,branchY],[resultCenter,resultY]],true);
            diagramCard(ctx,resultCenter-resultWidth/2,resultY,resultWidth,resultHeight,
                good?diagramColors.success:diagramColors.failure,good?'#b7d5ca':'#e2bfb8');
            label(state,resultCenter,resultY+8,ink);
            label(detail,resultCenter,resultY+12+state.height,ink);
        }
    }
    return finish();
}

// 同じ画像に拡大表示とPNG保存を結び付ける。
function attachImageControls(container,image,fullWidth,name) {
    const toolbar=document.createElement('div');
    toolbar.className='diagram-tools';
    const zoom=document.createElement('button');
    zoom.type='button';
    zoom.textContent=designI18n.translate('크게 보기');
    zoom.setAttribute('aria-expanded','false');
    zoom.addEventListener('click',()=>{
        const expanded=container.classList.toggle('full-diagram');
        zoom.textContent=designI18n.translate(expanded?'맞춤 보기':'크게 보기');
        zoom.setAttribute('aria-expanded',String(expanded));
        image.style.width=expanded?`${Math.max(fullWidth,container.clientWidth-18)}px`:'';
    });
    const download=document.createElement('a');
    download.href=image.src;
    download.download=name;
    download.textContent=designI18n.translate('PNG 저장');
    toolbar.append(zoom,download);
    const viewport=document.createElement('div');
    viewport.className='diagram-viewport';
    viewport.append(image);
    container.replaceChildren(toolbar,viewport);
}

// 図のラベルを翻訳してからPNGを生成し、操作ボタンを追加する。
async function renderDiagramImages(root,isCurrent) {
    const title=root.querySelector('h1')?.textContent.trim()||designI18n.translate('설계');
    const filename=title.replace(/[<>:"/\\|?*]/g,'-').slice(0,100);
    let number=0;
    const prepare=(container,image,width)=>{
        attachImageControls(container,image,width,`${filename}-${designI18n.translate('흐름도')}-${++number}.png`);
        container.dataset.renderState='done';
    };
    for(const image of root.querySelectorAll('img[src^="data:image/png;base64,"]')) {
        if(image.closest('.diagram[data-render-state="done"]')) continue;
        const figure=document.createElement('figure');
        figure.className='diagram';
        const parent=image.parentElement;
        if(parent.tagName==='P'&&parent.childElementCount===1&&!parent.textContent.trim()) parent.replaceWith(figure);
        else image.before(figure);
        figure.append(image);
        prepare(figure,image,900);
    }
    for(const container of root.querySelectorAll('.diagram[data-mermaid],.diagram[data-lanes],.diagram[data-implementation]')) {
        if(container.dataset.renderState||!isCurrent()||container.closest('details[data-deferred-diagrams]:not([open])')) continue;
        container.dataset.renderState='loading';
        try {
            const alt=container.dataset.alt||title+' '+designI18n.translate('흐름도');
            const append=async(target,png,description)=>{
                const image=document.createElement('img');
                image.src=png.url;
                image.width=Math.ceil(png.width);
                image.height=Math.ceil(png.height);
                image.alt=description;
                await image.decode();
                if(!isCurrent()) return;
                target.replaceChildren(image);
                prepare(target,image,png.width);
            };
            if(container.dataset.implementation) {
                await document.fonts.ready;
                await append(container,implementationPng(JSON.parse(container.dataset.implementation)),alt);
            } else if(container.dataset.lanes) {
                await document.fonts.ready;
                await append(container,flowLanesPng(designI18n.diagramData(JSON.parse(container.dataset.lanes))),alt);
            } else {
                const source=designI18n.mermaid(container.dataset.mermaid);
                const kind=source.trim().split(/\s+/,1)[0];
                const compact=kind==='flowchart'?compactFlowchart(source):source;
                const result=await window.mermaid.render(`design-diagram-${++renderDiagramImages.sequence}`,compact);
                await append(container,await diagramPng(result.svg,kind),alt);
            }
        } catch(error) {
            if(!isCurrent()) return;
            container.classList.add('failed');
            container.dataset.renderState='failed';
            container.textContent=designI18n.translate('PNG 흐름도 표시 실패')+' · '+String(error.message).split('\n')[0];
        }
    }
}

renderDiagramImages.sequence=0;

function compactFlowchart(source) {
    const decisions=[];
    const shaped=source.replace(/(^[ \t]*|-->[ \t]*(?:\|[^|\n]*\|[ \t]*)?)([\w-]+)\{([^{}\n]+)\}(?=[ \t]*(?:-->|$))/gm,
        (_,before,id,label)=>{
            decisions.push(id);
            return before+id+'{{'+label+'}}';
        });
    if(!decisions.length) return shaped;
    return shaped+'\nclassDef compactDecision fill:#eaf3fa,stroke:#8aaebf,color:#224953\nclass '+decisions.join(',')+' compactDecision';
}
