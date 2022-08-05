import { createRef, useEffect } from 'react';
import classNames from 'classnames';
import { action, runInAction } from 'mobx';
import { observer, useLocalObservable } from 'mobx-react-lite';
import CodeMirror from 'codemirror';
import { Button, CircularProgress, IconButton, OutlinedInput } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import {
  AddLink, FormatBold, FormatItalic, FormatListBulleted,
  FormatListNumbered, FormatQuote, Image, Visibility, VisibilityOff,
} from '@mui/icons-material';
import HeadingIcon from 'boxicons/svg/regular/bx-heading.svg?fill-icon';
import EditIcon from 'boxicons/svg/regular/bx-edit.svg?fill-icon';

import { compressImage, renderPostMarkdown, runLoading, SCHEMA_PREFIX } from '~/utils';
import { BackButton, UserAvatar } from '~/components';
import { nodeService, snackbarService, viewService } from '~/service';
import { selectImage } from '~/modals';

import { makeHeading, makeLink, toggleBlock, toggleLine } from './helper';

import './index.css';

export const NewPost = observer((props: { className?: string, onChange?: (v: string) => unknown }) => {
  const state = useLocalObservable(() => ({
    editor: null as null | CodeMirror.Editor,
    title: '',
    postContent: '',
    focused: false,
    preview: false,
    previewHTML: '',

    images: [] as Array<{ img: Blob, url: string, mimeType: string }>,

    posting: false,
    get titleLength() {
      return Math.ceil(
        this.title.split('').reduce(
          (p, c) => p + (c.charCodeAt(0) > 256 ? 1 : 0.5),
          0,
        ),
      );
    },
    get canPost() {
      return !!this.title && !!this.postContent;
    },
  }));
  const codeMirrorBox = createRef<HTMLDivElement>();

  const focusEditor = () => { state.editor?.focus(); };
  const handleMakeBold = () => { toggleBlock(state.editor!, 'bold', '**'); focusEditor(); };
  const handleMakeItalic = () => { toggleBlock(state.editor!, 'italic', '_'); focusEditor(); };
  const handleMakeHeading = () => { makeHeading(state.editor!); focusEditor(); };
  const handleMakeQuote = () => { toggleLine(state.editor!, 'quote'); focusEditor(); };
  const handleMakeUL = () => { toggleLine(state.editor!, 'unordered-list'); focusEditor(); };
  const handleMakeOL = () => { toggleLine(state.editor!, 'ordered-list'); focusEditor(); };
  const handleMakeLink = () => { makeLink(state.editor!); focusEditor(); };
  const handleMakeImage = async () => {
    const data = await selectImage();
    if (typeof data === 'string') {
      state.editor?.replaceSelection(`![](${data})`);
    }
    if (data instanceof File) {
      const img = await compressImage(data);
      if (!img) { return; }
      const url = URL.createObjectURL(img.img);
      state.images.push({ img: img.img, url, mimeType: img.mineType });
      state.editor?.replaceSelection(`![](${url})`);
    }
  };
  const handlePreview = action(() => {
    state.preview = !state.preview;
    if (!state.preview) { return; }
    state.previewHTML = renderPostMarkdown(state.postContent);
  });

  const handlePost = async () => {
    const allImages = state.postContent.matchAll(/!\[.*?\]\((blob:.+?)\)/g);
    const allLinks = Array.from(new Set([...allImages].map((v) => v[1])));
    const images = state.images.filter((v) => allLinks.includes(v.url)).map((v) => ({
      ...v,
      trxId: '',
    }));
    await runLoading(
      (l) => { state.posting = l; },
      async () => {
        for (const img of images) {
          const res = await nodeService.postImage(img.img, img.mimeType);
          img.trxId = res.trx_id;
        }

        const postContent = state.postContent.replaceAll(/(!\[.*?\])\((blob:.+?)\)/g, (sub, g1, g2) => {
          const img = images.find((v) => v.url === g2);
          if (!img) { return sub; }
          return `${g1}(${SCHEMA_PREFIX}${img?.trxId})`;
        });

        await nodeService.post.create(state.title, postContent);
        snackbarService.show('发布成功');
        viewService.back();
      },
    );
  };

  useEffect(() => {
    codeMirrorBox.current!.innerHTML = '';
    const editor = CodeMirror(codeMirrorBox.current!, {
      value: '',
      mode: 'markdown',
      theme: 'lucario',
      indentUnit: 2,
      placeholder: '支持 Markdown 语法',
      lineWrapping: true,
      extraKeys: {
        'Enter': 'newlineAndIndentContinueMarkdownList',
        'Tab': 'tabAndIndentMarkdownList',
        'Shift-Tab': 'shiftTabAndUnindentMarkdownList',
      },
    });
    runInAction(() => { state.editor = editor; });
    editor.on('focus', action(() => { state.focused = true; }));
    editor.on('blur', action(() => { state.focused = false; }));
    editor.on('change', action((e) => { state.postContent = e.getValue(); }));

    return () => {
      state.images.forEach((v) => URL.revokeObjectURL(v.url));
    };
  }, []);

  return (
    <div
      className={classNames(
        'relative z-20 flex justify-center flex-1 gap-x-[20px]',
        props.className,
      )}
    >
      <div className="relative w-[800px] bg-black/70 flex-col py-10 px-12">
        <BackButton className="fixed top-[60px] mt-6 -ml-17 -translate-x-full" />
        <div className="flex justify-between text-white">
          <div className="text-18">
            发布新帖
          </div>
          <div className="flex flex-center gap-x-2">
            <UserAvatar profile={nodeService.state.myProfile} />
            {nodeService.state.profileName}
          </div>
        </div>

        <OutlinedInput
          className="mt-5"
          color="light"
          placeholder="在这里输入标题"
          error={state.titleLength > 100}
          value={state.title}
          onChange={action((e) => { state.title = e.target.value; })}
        />

        <div
          className={classNames(
            'flex justify-end text-gray-9c text-12 px-2 mt-2',
            state.titleLength > 100 && 'text-red-500',
          )}
        >
          {state.titleLength}/100
        </div>

        <div className="flex justify-between mt-6">
          <div className="flex items-center gap-x-1">
            {([
              {
                onClick: handleMakeBold,
                icon: <FormatBold className="text-24 -mb-px" />,
              },
              {
                onClick: handleMakeItalic,
                icon: <FormatItalic className="text-24 -mb-px" />,
              },
              {
                onClick: handleMakeHeading,
                icon: <HeadingIcon className="text-22" />,
              },
              'divider',
              {
                onClick: handleMakeQuote,
                icon: <FormatQuote className="text-24" />,
              },
              {
                onClick: handleMakeUL,
                icon: <FormatListBulleted className="text-22" />,
              },
              {
                onClick: handleMakeOL,
                icon: <FormatListNumbered className="text-22" />,
              },
              'divider',
              {
                onClick: handleMakeLink,
                icon: <AddLink className="text-22" />,
              },
              {
                onClick: handleMakeImage,
                icon: <Image className="text-22" />,
              },
            ] as const).map((v, i) => (v === 'divider' ? (
              <div className="border-l border-white/40 h-5 mx-2" key={i} />
            ) : (
              <IconButton
                className="h-8 w-8 p-0 text-soft-blue"
                onClick={v.onClick}
                disabled={state.preview}
                key={i}
              >
                {v.icon}
              </IconButton>
            )))}
          </div>
          <div>
            <Button
              className="text-soft-blue"
              variant="text"
              color="light"
              onClick={handlePreview}
            >
              {!state.preview && <Visibility className="text-20 mr-2 -mt-px" />}
              {state.preview && <VisibilityOff className="text-20 mr-2 -mt-px" />}
              {state.preview ? '取消预览' : '预览'}
            </Button>
          </div>
        </div>

        <div
          className={classNames(
            'code-mirror-wrapper flex-col min-h-[280px] border rounded p-2 mt-2',
            !state.focused && 'border-white/25 hover:border-white/50',
            state.focused && 'border-white',
            state.preview && '!hidden',
          )}
          ref={codeMirrorBox}
        />

        <div
          className={classNames(
            'post-detail-box flex-none text-white',
            !state.preview && 'hidden',
          )}
          dangerouslySetInnerHTML={{ __html: state.previewHTML }}
        />

        <div
          className={classNames(
            'justify-end mt-6',
            state.preview && 'hidden',
            !state.preview && 'flex',
          )}
        >
          <LoadingButton
            className="rounded-full text-16 py-2 px-6"
            classes={{ loadingIndicator: 'left-5' }}
            loadingIndicator={<CircularProgress color="inherit" size={18} />}
            color="rum"
            variant="outlined"
            disabled={!state.canPost}
            onClick={handlePost}
            loading={state.posting}
            loadingPosition="start"
            startIcon={<EditIcon className="text-22" />}
          >
            立即发布
          </LoadingButton>
        </div>
      </div>

      <div className="w-[280px]">
        <div className="flex-col flex-center relative bg-black/70 pt-24 mt-18">
          <div className="w-25 h-25 rounded-full overflow-hidden bg-white absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/3 p-px">
            <div className="bg-blue-400/70 rounded-full h-full w-full" />
          </div>
          <div className="text-white text-center text-18">
            {nodeService.state.groupName}
          </div>

          <div className="border-t border-white/60 text-14 text-white m-5 pt-5">
            - 尊重原创 <br />
            请不要发布任何盗版下载链接，包括软件、音乐、电影等等。<br />
            <br />
            - 友好互助<br />
            保持对陌生人的友善。用知识去帮助别人。<br />
            <br />
            - 支持 Markdown<br />
            支持 GitHub Flavored Markdown 文本标记语法。<br />
            在正式提交之前，你可以点击本页面上的“预览”来查看实际渲染效果。<br />
          </div>
        </div>
      </div>
    </div>
  );
});
