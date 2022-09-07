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
import { BackButton, UserAvatar, GroupSideBox, NFTSideBox } from '~/components';
import { dialogService, nodeService, snackbarService, viewService } from '~/service';
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
    disposeBackPreventor: () => {},
    get titleLength() {
      return Math.ceil(
        this.title.split('').reduce(
          (p, c) => p + (c.charCodeAt(0) > 256 ? 1 : 0.5),
          0,
        ),
      );
    },
    get canPost() {
      return !!this.title.trim() && this.titleLength <= 100 && !!this.postContent.trim();
    },
    get postToEdit() {
      return viewService.state.page.page.name === 'newpost'
        ? viewService.state.page.page.value
        : null;
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
    if (data instanceof Blob) {
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
          const res = await nodeService.post.postImage(img.img, img.mimeType);
          img.trxId = res.trx_id;
        }

        const postContent = state.postContent.replaceAll(/(!\[.*?\])\((blob:.+?)\)/g, (sub, g1, g2) => {
          const img = images.find((v) => v.url === g2);
          if (!img) { return sub; }
          return `${g1}(${SCHEMA_PREFIX}${img?.trxId})`;
        });

        if (state.postToEdit) {
          await nodeService.post.edit(state.postToEdit, state.title.trim(), postContent);
        } else {
          await nodeService.post.create(state.title.trim(), postContent);
        }
        runInAction(() => {
          images.forEach((v) => {
            const url = URL.createObjectURL(v.img);
            nodeService.state.post.imageCache.set(v.trxId, url);
          });
        });
        snackbarService.show(state.postToEdit ? '编辑成功' : '发布成功');
        state.disposeBackPreventor();
        viewService.back();
      },
    );
  };

  useEffect(() => {
    const content = state.postToEdit?.content ?? '';
    codeMirrorBox.current!.innerHTML = '';
    const editor = CodeMirror(codeMirrorBox.current!, {
      value: content,
      mode: 'markdown',
      theme: 'lucario',
      indentUnit: 2,
      placeholder: '支持 Markdown 语法',
      lineWrapping: true,
      extraKeys: {
        'Enter': 'newlineAndIndentContinueMarkdownList',
        'Ctrl-Enter': () => {
          if (state.canPost) {
            handlePost();
          }
        },
        'Tab': 'tabAndIndentMarkdownList',
        'Shift-Tab': 'shiftTabAndUnindentMarkdownList',
      },
    });
    runInAction(() => {
      state.editor = editor;
      state.title = state.postToEdit?.title ?? '';
    });
    editor.on('focus', action(() => { state.focused = true; }));
    editor.on('blur', action(() => { state.focused = false; }));
    editor.on('change', action((e) => { state.postContent = e.getValue(); }));

    state.disposeBackPreventor = viewService.addBackPreventor(async () => {
      if (!state.postToEdit) { return true; }
      const unchanged = state.postToEdit.content === state.editor?.getValue() && state.postToEdit.title === state.title;
      if (unchanged) { return true; }
      const result = await dialogService.open({
        content: '未提交的修改将不会被保存，确实要返回吗？',
        cancel: '继续编辑',
        confirm: '返回',
      });
      return result === 'confirm';
    });

    return () => {
      state.disposeBackPreventor();
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
      <div className="relative w-[800px] bg-black/80 flex-col py-10 px-12">
        <BackButton className="fixed top-[60px] mt-6 -ml-17 -translate-x-full" />
        <div className="flex justify-between text-white">
          <div className="text-18">
            {state.postToEdit ? '编辑帖子' : '发布新帖'}

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
            {state.postToEdit ? '提交修改' : '立即发布'}
          </LoadingButton>
        </div>
      </div>

      <div className="w-[280px]">
        <div className="fixed w-[280px]">
          <GroupSideBox className="mt-16" />

          <NFTSideBox className="mt-8" />
        </div>
      </div>
    </div>
  );
});
