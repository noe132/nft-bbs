import mdit from 'markdown-it';
import type Token from 'markdown-it/lib/token';
import type StateCore from 'markdown-it/lib/rules_core/state_core';
import mdanchor from 'markdown-it-anchor';
import mdtasklist from 'markdown-it-task-lists';
import DOMPurify from 'dompurify';

export const createBaseRenderer = (options?: mdit.Options) => {
  const renderer = mdit({
    html: false,
    breaks: false,
    // highlight: (str, lang) => {
    //   if (lang && hljs.getLanguage(lang)) {
    //     try {
    //       const code = hljs.highlight(str, {
    //         language: lang,
    //         ignoreIllegals: true,
    //       }).value;
    //       return `<pre class="hljs-code-block"><code>${code}</code></pre>`;
    //     } catch (e) {}
    //   }
    //   return '';
    // },
    ...options,
  });

  renderer.use(mdanchor);
  renderer.use(mdtasklist);

  return renderer;
};

export const defaultRenderer = createBaseRenderer();
export const renderPostMarkdown = (md: string) => {
  let id = 0;
  const replaceMap = new Map<string, string>();
  let processedMD = md.replaceAll(/(```[\s\S]+?```)/g, (sub) => {
    id += 1;
    const placeholder = `$$$$####!!!!${id}!!!!####$$$$`;
    replaceMap.set(placeholder, sub);
    return placeholder;
  });
  processedMD = processedMD.replaceAll(/\n+/g, '\n\n');
  processedMD = processedMD.replaceAll(/(\$\$\$\$####!!!!\d+!!!!####\$\$\$\$)/g, (sub) => replaceMap.get(sub) ?? '');
  return DOMPurify.sanitize(defaultRenderer.render(processedMD), {
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|blob|rum):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });
};

const modifyToken = (token: any, mdfn: any, env: any) => {
  // create attrObj for convenient get/set of attributes
  const attrObj = token.attrs ? token.attrs.reduce((acc: any, pair: any) => {
    acc[pair[0]] = pair[1];
    return acc;
  }, {}) : {};
  token.attrObj = attrObj;
  mdfn(token, env);
  // apply any overrides or new attributes from attrObj
  Object.keys(token.attrObj).forEach((k) => {
    token.attrSet(k, token.attrObj[k]);
  });
};


type ModifyFn = (token: Token, env: StateCore['env']) => unknown;

export const createMarkdownItModifyToken = (modifyFn: ModifyFn) => {
  const fn: mdit.PluginSimple = (mdd) => {
    mdd.core.ruler.push(
      'modify-token',
      (state) => {
        state.tokens.forEach((token) => {
          if (token.children && token.children.length) {
            token.children.forEach((cToken) => {
              modifyToken(cToken, modifyFn, state.env);
            });
          }
          modifyToken(token, modifyFn, state.env);
        });
        return false;
      },
    );
  };
  return fn;
};