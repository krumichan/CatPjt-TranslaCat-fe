'use strict';

function formatJson(text) {
    try { JSON.parse(text); } catch { return null; }
    // Keep the original tokens, including large integer IDs and decimal precision.
    const tokens=text.match(/"(?:[^"\\]|\\[\s\S])*"|[{}\[\],:]|[^\s{}\[\],:]+/g);
    let depth=0, result='';
    const line=()=>`\n${'  '.repeat(depth)}`;
    for(const [i,token] of tokens.entries()) {
        const previous=tokens[i-1];
        if(token==='{'||token==='[') {
            result+=token;
            depth++;
            if(!['}',']'].includes(tokens[i+1])) result+=line();
        } else if(token==='}'||token===']') {
            depth--;
            if(!['{','['].includes(previous)) result+=line();
            result+=token;
        } else if(token===',') result+=token+line();
        else if(token===':') result+=': ';
        else result+=token;
    }
    return result;
}

if(typeof module!=='undefined') module.exports={formatJson};
