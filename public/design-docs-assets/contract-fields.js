'use strict';

function splitArguments(text) {
    const parts=[];
    const stack=[];
    const pairs={'(':')','[':']','{':'}','<':'>'};
    let start=0, quote='';
    for(let i=0;i<text.length;i++) {
        const c=text[i];
        if(quote) {
            if(c==='\\') i++;
            else if(c===quote) quote='';
        } else if(c==='"'||c==="'"||c==='`') quote=c;
        else if(pairs[c] && !(c==='<'&&text[i+1]==='=')) stack.push(pairs[c]);
        else if(c===stack.at(-1)) stack.pop();
        else if(c===','&&!stack.length) {parts.push(text.slice(start,i));start=i+1;}
    }
    return [...parts,text.slice(start)].map(part=>part.trim()).filter(Boolean);
}

function parameterRows(params='',language='java') {
    const content=params.trim().replace(/^\(\s*/,'').replace(/\s*\)$/,'');
    return splitArguments(content).filter(part=>part!=='*'&&part!=='/').map(part=>{
        const binding=part.match(/@(?:PathVariable|RequestParam|RequestHeader|RequestBody|RequestPart|ModelAttribute|AuthenticationPrincipal|RequestAttribute)\b|\bFrom(?:Route|Query|Header|Body|Form|Services)\b/)?.[0];
        const positions={'@PathVariable':'path','@RequestParam':'query','@RequestHeader':'header','@RequestBody':'body','@RequestPart':'multipart','@ModelAttribute':'query','@AuthenticationPrincipal':'인증 컨텍스트','@RequestAttribute':'인증 컨텍스트',FromRoute:'path',FromQuery:'query',FromHeader:'header',FromBody:'body',FromForm:'multipart',FromServices:'서비스 주입'};
        const position=positions[binding]??'';
        const annotationDefault=part.match(/defaultValue\s*=\s*"([^"]*)"/)?.[1];
        const externalName=part.match(/@(?:PathVariable|RequestParam|RequestHeader|RequestPart)\(\s*(?:(?:value|name)\s*=\s*)?"([^"]+)"/)?.[1]
            ??part.match(/\b(?:JsonPropertyName|JsonProperty)\(\s*"([^"]+)"/)?.[1];
        const annotations=part.match(/@\w+(?:\([^)]*\))?/g)??[];
        const stripped=part.replace(/@\w+(?:\([^)]*\))?/g,'').replace(/^\s*(?:\[(?:From\w+|ModelBinder|BindRequired|Required|JsonRequired|property\s*:)[^\]]*\]\s*)+/, '').trim();
        const optionalDefault=stripped.match(/\s*=\s*(.+)$/)?.[1];
        const declarator=optionalDefault===undefined?stripped:stripped.replace(/\s*=\s*.+$/,'').trim();
        const colon=['kotlin','typescript','tsx','python'].includes(language);
        const match=colon?declarator.match(/^(?:(?:val|var|vararg|crossinline|noinline)\s+)*([\w$*]+)(\??)(?:\s*:\s*(.+))?$/):declarator.match(/^(.+?)\s+([\w$]+)(?:\s*(\[\]))?$/);
        const name=match?(colon?match[1]:match[2]):(/^[\w$]+$/.test(declarator)?declarator:null);
        const type=match?(colon?match[3]:`${match[1].replace(/^(?:final|params|ref|out|in|this)\s+/,'')}${match[3]??''}`):null;
        const defaultValue=annotationDefault??optionalDefault;
        const optional=defaultValue!==undefined||/required\s*=\s*false/.test(part)||(colon&&match?.[2]==='?')||type?.endsWith('?');
        const required=optional?'선택':position||/@(?:NotNull|NotBlank|NotEmpty)\b|\b(?:BindRequired|JsonRequired)\b|\[Required\b/.test(part)?'필수':'선언상 인자';
        const constraints=annotations.flatMap(value=>{
            if(/^@(Min|Max|Size|Positive|DecimalMin|NotBlank|NotEmpty|Pattern)\b/.test(value)) {
                const [,rule,details]=value.match(/^@(\w+)(?:\((.*)\))?$/);
                return `${({Min:'최솟값',Max:'최댓값',Size:'크기',Positive:'양수',DecimalMin:'최소 금액',NotBlank:'공백 불가',NotEmpty:'빈 값 불가',Pattern:'문자열 패턴'})[rule]}${details?' '+details:''}`;
            }
            return [];
        }).join(' · ');
        return {name:name??'구조 분해 또는 이름 미확인',type:type??'추론형 또는 미확인',position,wireName:externalName??name,required,defaultValue,constraints};
    });
}

function declaredReturn(signature='',params='',name='',language='java') {
    const trimmed=signature.replace(/@\w+(?:\((?:[^()"']|"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\([^()]*\))*\))?/g,'')
        .replace(/^(?:\s*\[(?:Http\w+|Route)[^\]]*\])+/,'').trim();
    if(['kotlin','typescript','tsx','python'].includes(language)) {
        const start=signature.indexOf(params);
        const end=start<0||!params?'':signature.slice(start+params.length).trim();
        return end.match(/^(?::|->)\s*([^=]+?)(?:\s*=>|\s*=$|:\s*(?:#.*)?$|$)/)?.[1]?.trim()||null;
    }
    const offset=trimmed.indexOf(name+'(')>=0?trimmed.indexOf(name+'('):trimmed.indexOf(name+' (');
    if(offset<0) return null;
    const prefix=trimmed.slice(0,offset).replace(/\b(public|private|protected|internal|static|async|sealed|final|override|virtual|inline|synchronized|constexpr|abstract)\s+/g,'').trim();
    return prefix.replace(/(?:\b\w+::)+$/, '').replace(/^<[^>]+>\s*/,'').trim()||null;
}

if(typeof module!=='undefined') module.exports={splitArguments,parameterRows,declaredReturn};
