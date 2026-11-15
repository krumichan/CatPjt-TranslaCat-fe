'use strict';

/** 静的な辞書で画面とフロー図を翻訳する。ルートとDOM構造は呼び出し元が管理する。 */
const designI18n = (() => {
    const korean = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/;
    const localeCodes = new Set(['ko','ja','en']);
    const dictionaries = new Map();
    const lookups = new Map();
    const copyAttributes = ['aria-label','title','placeholder','alt','data-alt'];
    const browser = typeof window !== 'undefined';
    let language = 'ko';

    // 対応言語を選択し、文書のlang属性を同期する。
    function setLanguage(code) {
        language = localeCodes.has(code) ? code : 'ko';
        if(browser) document.documentElement.lang = language;
    }

    // 指定言語の辞書を置き換え、以前の検索結果を破棄する。
    function register(code, dictionary) {
        dictionaries.set(code, dictionary);
        lookups.delete(code);
    }

    function key(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    // 表示例の文字列値を翻訳し、キーとHTTPヘッダーを保持する。
    function localizeJson(pre) {
        const code=pre.querySelector('code.language-json,code.language-http');
        if(!code) return;
        const original=code.textContent;
        const offset=code.classList.contains('language-http')?original.indexOf('\n\n')+2:0;
        if(code.classList.contains('language-http')&&offset<2) return;
        try {
            const payload=JSON.parse(original.slice(offset));
            code.textContent=original.slice(0,offset)+JSON.stringify(diagramData(payload),null,2);
        } catch {
            // 不完全なペイロードの抜粋は根拠として元の内容を表示する。
        }
    }

    /** 空白と識別子を保持し、韓国語の文言を選択言語に置き換える。 */
    function translate(text) {
        if(language==='ko'||typeof text!=='string'||!korean.test(text)) return text;
        const dictionary=dictionaries.get(language);
        if(!dictionary) return text;
        // 共通の文字数制約では数値と単位を保持する。
        const normalized=key(text);
        const limit=normalized.match(/^(최대|최소)\s*(\d[\d,]*)\s*자(\.)?$/);
        if(limit) {
            const [,kind,amount,dot]=limit;
            return language==='ja'?`${kind==='최대'?'最大':'最小'}${amount}文字${dot?'。':''}`:
                `${kind==='최대'?'Maximum':'Minimum'} ${amount} characters${dot??''}`;
        }
        if(/^(?:공백 불가|빈 값 불가)\s*·\s*(?:최대|최소)\s*[\d,]+\s*자\.?$/.test(normalized)) {
            return normalized.split(/\s*·\s*/).map(translate).join(language==='ja'?'・':' · ');
        }
        // 文全体の訳を優先し、動的に組み立てた文字列は文節単位で置き換える。
        const exact=dictionary[normalized];
        let value=typeof exact==='string'&&exact.length?exact:undefined;
        if(value===undefined) {
            // 動的な文言には識別子、数値、リンクが含まれる。
            const parts=text.split(/(\s*[·→]\s*|\r?\n)/);
            if(!lookups.has(language)) lookups.set(language,new Map());
            const lookup=lookups.get(language);
            value=parts.map(part=>{
                if(!korean.test(part)) return part;
                const normalizedPart=key(part);
                if(Object.hasOwn(dictionary,normalizedPart)) return part.replace(normalizedPart,dictionary[normalizedPart]);
                const cached=lookup.get(normalizedPart);
                if(cached!==undefined) return part.replace(normalizedPart,cached);
                const translated=normalizedPart.replace(/[가-힣][가-힣\s]*(?:[?!.])?/g, phrase=>{
                    const trailing=phrase.match(/\s*$/)[0];
                    const candidate=phrase.trimEnd();
                    if(Object.hasOwn(dictionary,candidate)) return dictionary[candidate]+trailing;
                    const words=candidate.split(' ');
                    const fragments=[];
                    for(let i=0;i<words.length;){
                        let end=Math.min(words.length,i+8);
                        for(;end>i;end--) {
                            const source=words.slice(i,end).join(' ');
                            if(!Object.hasOwn(dictionary,source)) continue;
                            fragments.push(dictionary[source]);
                            break;
                        }
                        if(end===i) {fragments.push(words[i]);end=i+1;}
                        i=end;
                    }
                    return fragments.join(' ')+trailing;
                });
                lookup.set(normalizedPart,translated);
                return part.replace(normalizedPart,translated);
            }).join('');
            return value;
        }
        const leading=text.match(/^\s*/)[0];
        const trailing=text.match(/\s*$/)[0];
        return leading+value+trailing;
    }

    // ラベルの改行を保ち、訳文に含まれる構文文字をエスケープする。
    function diagramLabel(label, transform, escapeHtmlSyntax=true) {
        if(!korean.test(label)) return label;
        const decoded=label.replace(/#(\d+);/g,(_,number)=>String.fromCharCode(Number(number)));
        if(transform===translate&&language==='ko') return label;
        return decoded.split(/(<br\s*\/?\s*>)/i).map((part,i)=>{
            if(i%2) return part;
            const translated=transform(part);
            return escapeHtmlSyntax?translated.replace(/[&<>"'|`\\#()[\]{}]/g,char=>`#${char.charCodeAt(0)};`):
                translated.replace(/[^\S ]+/g,' ').replace(/[<>]/g,char=>char==='<'?'‹':'›');
        }).join('');
    }

    /** Mermaidのラベルだけを変換し、ノードIDと接続を保持する。 */
    function mermaid(source, transform=translate) {
        const label=value=>diagramLabel(value,transform);
        const er=source.trimStart().startsWith('erDiagram');
        return source.split('\n').map(line=>{
            if(!korean.test(line)) return line;
            if(er&&line.includes(' : ')) {
                const separator=line.lastIndexOf(' : ');
                const name=line.slice(separator+3).trim().replace(/^"|"$/g,'');
                return line.slice(0,separator+3)+'"'+diagramLabel(name,transform,false).replaceAll('"','”')+'"';
            }
            const sequence=line.match(/^(\s*(?:(?:participant|actor)\s+\S+\s+as\s+|(?:Note\s+(?:over|left of|right of)\s+[^:]+|\S+\s*[-<][->>x+).|\s-]+\s*\w+)\s*:\s*|(?:alt|else|opt|loop|par|and|critical|option|break)\s+))(.+)$/i);
            if(sequence) return sequence[1]+diagramLabel(sequence[2],transform,false);
            return line.replace(/"([^"\n]*)"|\|([^|\n]+)\||([\[({])([^\[\]{}()"|]*[가-힣][^\[\]{}()"|]*)(?=[\])}])/g,
                (full,quoted,edge,open,value)=>{
                    if(quoted!==undefined) return '"'+label(quoted)+'"';
                    if(edge!==undefined) return '|'+label(edge)+'|';
                    return open+label(value);
                });
        }).join('\n');
    }

    /** データ構造を保ち、文字列値にだけ変換を適用する。 */
    function diagramData(data, transform=translate) {
        if(Array.isArray(data)) return data.map(item=>diagramData(item,transform));
        if(data&&typeof data==='object') return Object.fromEntries(Object.entries(data).map(([name,item])=>[name,diagramData(item,transform)]));
        return typeof data==='string'?transform(data):data;
    }

    // 英文ではインラインコードと隣接する単語の間に空白を補う。
    function spaceInlineCode(root) {
        for(const code of root.querySelectorAll('p code, li code, td code')) {
            if(code.closest('pre,[data-original]')) continue;
            const previous=code.previousSibling;
            const next=code.nextSibling;
            if(previous?.nodeType===1||previous?.nodeType===3) {
                if(/[\p{L}\p{N}]$/u.test(previous.textContent)&&/^[\p{L}\p{N}/]/u.test(code.textContent)) code.before(' ');
            }
            if(next?.nodeType===1||next?.nodeType===3) {
                if(/^[\p{L}\p{N}]/u.test(next.textContent)) code.after(' ');
            }
        }
    }

    /** 表示文言とアクセシビリティ属性を更新し、原文のソース根拠を保持する。 */
    function localize(root) {
        if(language==='ko') return;
        const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
        while(walker.nextNode()) {
            const node=walker.currentNode;
            if(!node.parentElement.closest('pre, [data-original]')) node.nodeValue=translate(node.nodeValue);
        }
        // 画像の代替テキストと入力案内は属性から取得して更新する。
        for(const attr of copyAttributes) {
            for(const item of root.querySelectorAll(`[${attr}]`)) item.setAttribute(attr,translate(item.getAttribute(attr)));
        }
        for(const pre of root.querySelectorAll('pre.json-block:not([data-original])')) localizeJson(pre);
        if(language==='en') spaceInlineCode(root);
    }

    return {setLanguage,register,translate,localize,key,mermaid,diagramData,korean,localeCodes,get language(){return language;}};
})();

if(typeof module==='object') module.exports=designI18n;
if(typeof window!=='undefined') window.registerDesignLocale=(code,dictionary)=>designI18n.register(code,dictionary);
