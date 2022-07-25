import CodeMirror from 'codemirror';

const getState = (cm: any, _pos?: CodeMirror.Position) => {
  const pos = _pos || cm.getCursor('start');
  const stat = cm.getTokenAt(pos);
  if (!stat.type) return {};

  const types = stat.type.split(' ');

  const ret: any = {};
  let data;
  let text;
  for (let i = 0; i < types.length; i += 1) {
    data = types[i];
    if (data === 'strong') {
      ret.bold = true;
    } else if (data === 'variable-2') {
      text = cm.getLine(pos.line);
      if (/^\s*\d+\.\s/.test(text)) {
        ret['ordered-list'] = true;
      } else {
        ret['unordered-list'] = true;
      }
    } else if (data === 'atom') {
      ret.quote = true;
    } else if (data === 'em') {
      ret.italic = true;
    } else if (data === 'quote') {
      ret.quote = true;
    } else if (data === 'strikethrough') {
      ret.strikethrough = true;
    } else if (data === 'comment') {
      ret.code = true;
    } else if (data === 'link') {
      ret.link = true;
    } else if (data === 'tag') {
      ret.image = true;
    } else if (/^header(-[1-6])?$/.exec(data)) {
      ret[data.replace('header', 'heading')] = true;
    }
  }
  return ret;
};

export const toggleBlock = (editor: any, type: string, start_chars: string, _end_chars?: string) => {
  // if (editor.codemirror.getWrapperElement().lastChild.className.includes('editor-preview-active')){
  //   return;
  // }

  const end_chars = typeof _end_chars === 'undefined' ? start_chars : _end_chars;
  const cm = editor;
  const stat = getState(cm);

  let text;
  let start = start_chars;
  let end = end_chars;

  const startPoint = cm.getCursor('start');
  const endPoint = cm.getCursor('end');

  if (stat[type]) {
    text = cm.getLine(startPoint.line);
    start = text.slice(0, startPoint.ch);
    end = text.slice(startPoint.ch);
    if (type === 'bold') {
      start = start.replace(/(\*\*|__)(?![\s\S]*(\*\*|__))/, '');
      end = end.replace(/(\*\*|__)/, '');
    } else if (type === 'italic') {
      start = start.replace(/(\*|_)(?![\s\S]*(\*|_))/, '');
      end = end.replace(/(\*|_)/, '');
    } else if (type === 'strikethrough') {
      start = start.replace(/(\*\*|~~)(?![\s\S]*(\*\*|~~))/, '');
      end = end.replace(/(\*\*|~~)/, '');
    }
    cm.replaceRange(start + end, {
      line: startPoint.line,
      ch: 0,
    }, {
      line: startPoint.line,
      ch: 99999999999999,
    });

    if (type === 'bold' || type === 'strikethrough') {
      startPoint.ch -= 2;
      if (startPoint !== endPoint) {
        endPoint.ch -= 2;
      }
    } else if (type === 'italic') {
      startPoint.ch -= 1;
      if (startPoint !== endPoint) {
        endPoint.ch -= 1;
      }
    }
  } else {
    text = cm.getSelection();
    if (type === 'bold') {
      text = text.split('**').join('');
      text = text.split('__').join('');
    } else if (type === 'italic') {
      text = text.split('*').join('');
      text = text.split('_').join('');
    } else if (type === 'strikethrough') {
      text = text.split('~~').join('');
    }
    cm.replaceSelection(start + text + end);

    startPoint.ch += start_chars.length;
    endPoint.ch = startPoint.ch + text.length;
  }

  cm.setSelection(startPoint, endPoint);
  cm.focus();
};


export const toggleLine = (cm: any, name: string) => {
  // if (cm.getWrapperElement().lastChild.className.includes('editor-preview-active')) return;
  const listRegexp = /^(\s*)(\*|-|\+|\d*\.)(\s+)/;
  const whitespacesRegexp = /^\s*/;

  const stat = getState(cm);
  const startPoint = cm.getCursor('start');
  const endPoint = cm.getCursor('end');
  const repl: any = {
    'quote': /^(\s*)>\s+/,
    'unordered-list': listRegexp,
    'ordered-list': listRegexp,
  };

  const _getChar = (n: string, i: number) => {
    const map: any = {
      'quote': '>',
      'unordered-list': '*',
      'ordered-list': '%%i.',
    };

    return map[n].replace('%%i', i);
  };

  const _checkChar = (n: string, char: string) => {
    const map: any = {
      'quote': '>',
      'unordered-list': '*',
      'ordered-list': '\\d+.',
    };
    const rt = new RegExp(map[n]);

    return char && rt.test(char);
  };

  const _toggle = (n: string, _text: string, untoggleOnly: boolean) => {
    let text = _text;
    const arr = listRegexp.exec(text);
    let char = _getChar(n, line);
    if (arr !== null) {
      if (_checkChar(n, arr[2])) {
        char = '';
      }
      text = arr[1] + char + arr[3] + text.replace(whitespacesRegexp, '').replace(repl[n], '$1');
    } else if (untoggleOnly === false) {
      text = char + ' ' + text;
    }
    return text;
  };

  let line = 1;
  for (let i = startPoint.line; i <= endPoint.line; i += 1) {
    let text = cm.getLine(i);
    if (stat[name]) {
      text = text.replace(repl[name], '$1');
    } else {
      // If we're toggling unordered-list formatting, check if the current line
      // is part of an ordered-list, and if so, untoggle that first.
      // Workaround for https://github.com/Ionaru/easy-markdown-editor/issues/92
      if (name === 'unordered-list') {
        text = _toggle('ordered-list', text, true);
      }
      text = _toggle(name, text, false);
      line += 1;
    }
    cm.replaceRange(text, {
      line: i,
      ch: 0,
    }, {
      line: i,
      ch: 99999999999999,
    });
  }
  cm.focus();
};

export const makeLink = (cm: any) => {
  const stat = getState(cm);
  const url = 'https://';
  _replaceSelection(cm, stat.link, ['[', '](#url#)'], url);
};

export const makeImage = (cm: any) => {
  const stat = getState(cm);
  const url = 'https://';
  _replaceSelection(cm, stat.link, ['![', '](#url#)'], url);
};

export const makeHeading = (cm: CodeMirror.Editor) => {
  let content = '';
  const cursor = cm.getCursor();
  const line = cm.getLine(cursor.line);
  const match = /^(#+) (.*)$/.exec(line);
  if (!match) {
    content = `# ${line}`;
  } else {
    const heading = match[1].length;
    if (heading === 6) {
      content = match[2];
    } else {
      content = `#${line}`;
    }
  }
  cm.replaceRange(
    content,
    { line: cursor.line, ch: 0 },
    { line: cursor.line, ch: Number.MAX_SAFE_INTEGER },
  );
};

const _replaceSelection = (cm: any, active: boolean, startEnd: [string, string], url: string) => {
  // if (cm.getWrapperElement().lastChild.className.includes('editor-preview-active')) return;

  let text;
  let start = startEnd[0];
  let end = startEnd[1];
  const startPoint = {} as CodeMirror.Position;
  const endPoint = {} as CodeMirror.Position;
  Object.assign(startPoint, cm.getCursor('start'));
  Object.assign(endPoint, cm.getCursor('end'));
  if (url) {
    start = start.replace('#url#', url); // url is in start for upload-image
    end = end.replace('#url#', url);
  }
  if (active) {
    text = cm.getLine(startPoint.line);
    start = text.slice(0, startPoint.ch);
    end = text.slice(startPoint.ch);
    cm.replaceRange(start + end, {
      line: startPoint.line,
      ch: 0,
    });
  } else {
    text = cm.getSelection();
    cm.replaceSelection(start + text + end);

    startPoint.ch += start.length;
    if (startPoint !== endPoint) {
      endPoint.ch += start.length;
    }
  }
  cm.setSelection(startPoint, endPoint);
  cm.focus();
};
