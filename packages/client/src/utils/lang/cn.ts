export const content = {
  header: {
    myAccountInfo: '我的账号信息',
    accountInfo: '账号信息',
    login: '登录',
    anonymous: '游客',
    myPosts: '我的发布',
    logout: '退出登录',
    exitCurrentPort: '退出当前论坛',
  },
  join: {
    title: '登录 Port 论坛',
    seedInputPlaceholder: '输入地址访问论坛 Rum://',
    seedInputTooltip: '除了下列 Port 官方建立的论坛，您也可以使用种子网络地址访问其他 Rum 网络中存在的论坛。',
    deletePrivateGroupTooltip: '不再显示',
    joinByAnonymous: '随便看看',
    lastUsedMixinTooltip: '用上次使用的 Mixin 登录',
    lastUsedMixin: '上次的 Mixin 账号:',
    lastUsedMixinClear: '清除保存的 Mixin 账号',
    lastUsedKeystoreTooltip: '用上次使用的 Keystore 账号登录',
    lastUsedKeystore: '上次的 keystore:',
    lastUsedKeystoreClear: '清除保存的 keystore',
    lastUsedMetaMaskTooltip: '用上次使用的 MetaMask 账号登录',
    lastUsedMetaMask: '上次的 MetaMask :',
    lastUsedMetaMaskClear: '清除保存的 MetaMask',
    mixinTooltip: '使用 Mixin 账号登录',
    mixin: '使用 Mixin 扫码登录',
    keystoreTooltip: '新建一个 Keystore 登录',
    keystore: '创建 Keystore 登录',
    metaMaskTooltip: '使用 MetaMask 登录',
    metaMask: 'MetaMask 登录',
    randomKeystoreTooltip: '创建一个随机账号',
    randomKeystore: '随机账号登录',
    inputKeystoreTooltip: '输入 Keystore 和 密码',
    inputKeystore: '输入 Keystore',
    more: '更多登录方式',
    anonymous: '随便看看 (游客模式)',
    back: '返回',
    keystoreDialogTitle: '注册/登录',
    keystorePassword: '密码',
    rememberPassword: '记住 keystore 和 密码',
    createNewKeystore: '创建新钱包',
    createNewKeystoreDone: '已创建新钱包，请保存好keystore和密码。',
    invalidKeystore: 'keystore或密码错误',
    loginFailed: '登录失败',
    seedValidationFailedTitle: '检验错误',
    invalidSeed: '种子解析错误',
    metaMaskPluginTip: '请先安装 MetaMask 插件',
    metaMaskPluginCancel: '我知道了',
    metaMaskPluginInstall: '去安装',
    metaMaskInvalidAddress: '加解密的 address 不匹配',
    deleteGroupTitle: '不再显示',
    deleteGroupContent: '这将不再显示这个 Port 论坛（可通过 SeedUrl 或 链接重新加入）。是否继续？',
  },
  init: {
    loading: '正在加载...',
    failedToLoadConfig: '加载设置失败',
    failedToLoadGroups: '加载port列表失败',
    refresh: '刷新页面重试',
  },
  postlist: {
    latest: '最新',
    hotest: '最热',
    week: '周',
    month: '月',
    year: '年',
    all: '一直',
    search: '搜索',
    searchPlaceholder: '搜索论坛…',
    emptyTip: '暂无帖子',
    noSearchResult: '没有找到搜索结果',
  },
  post: {
    notFound: '404 帖子不存在',
    backToPostList: '返回首页',
    deleteButton: '删除帖子',
    deleteTitle: '删除帖子',
    deleteContent: '确定要删除这个帖子吗？',
    deleteSuccessTitle: '删除成功',
    deleteSuccessContent: '帖子将会在数据同步后删除。',
    urlCopied: '帖子地址已复制到剪切板',
  },
  comment: {
    emptyCommentTip: '请输入评论',
    maxLengthTip: (length: number) => `请输入少于${length}字`,
    postComment: '发布评论',
    sortByLatest: '最新在前',
    sortByOldest: '最早在前',
    sortByHotest: '最热在前',
    commentCount: (n: number) => `${n} 条评论`,
    comment: '评论',
    writeAComment: '我来写第一个评论',
    noComment: '暂无评论',
    reply: '回复',
    replyTo: '回复',
    replyingTo: '正在回复',
    clearText: '清除文本',
    submit: '发表回复',
    commentInputPlaceholder: '在这里写下你的评论…',
    replyCount: (n: number) => `共 ${n} 条回复`,
    waitForSync: '请等待回复同步完成',
  },
  profile: {
    heldedNFTs: (self: boolean) => `${self ? '我' : 'Ta'}持有的 NFT`,
    nftTransfer: 'NFT 交易或转让',
    editProfile: '修改身份资料',
    editSuccess: '修改成功',
    joinAt: (time: string) => `加入于 ${time}`,
    postCount: (n: number) => `共发表 ${n} 帖`,
    noPostYet: 'Ta还没有发布过帖子',
  },
  notification: {
    pageTitle: '消息通知',
    goToItem: '前往查看',
    emptyTip: '暂无消息通知',
    types: {
      postComment: '评论了您的帖子',
      postLike: '给你的帖子点赞',
      postDislike: '给你的帖子点踩',
      commentComment: '评论了您的评论',
      commentLike: '给你的评论点赞',
      commentDislike: '给你的评论点踩',
    },
    nft: {
      request: '申请了NFT：',
      response: (approved: boolean, reply: string) => `管理员${approved ? '批准' : '拒绝'}了NFT申请: ${reply}`,
    },
  },
  newPost: {
    pageTitle: '新帖子',
    postTitleInputPlaceholder: '在这里输入标题',
    postInputPlaceholder: '支持 Markdown 语法',
    imageUploadFailed: '帖子发布失败。（图片上传失败）',
    editSuccess: '编辑成功',
    submitSuccess: '发布成功',
    edit: '编辑帖子',
    new: '发布新帖',
    preview: '预览',
    cancelPreview: '取消预览',
    submitEdit: '提交修改',
    submit: '立即发布',
  },
  common: {
    confirm: '确定',
    synced: '已同步',
    sycing: '同步中',
    untitled: '无标题',
    imagePlaceholder: '[图片]',
    like: '赞',
    dislike: '踩',
    loadMore: '加载更多',
    noMore: '没有啦',
    share: '分享',
    underDev: '功能开发中',
    cancel: '取消',
    submit: '提交',
    networkError: '网络请求错误',
  },
  portList: {
    joinedPorts: '我可以去的论坛',
    loginOrSignup: '登录/注册 >',
    expand: '查看全部',
    shrink: '收起未登录论坛',
  },
  groupCard: {
    postlist: '帖子列表',
    newPost: '发布新帖',
  },
  nftBox: {
    request: '申请 NFT',
    requestTitle: '申请该论坛 NFT',
    requestTip: '请输入申请理由',
    requestSuccess: '提交成功',
    noNFT: '当前没有持有任何 NFT',
    reason: '申请理由',
  },
  footer: {
    about: '关于',
    howto: '怎样创建 Port 论坛？',
  },
  editImage: {
    title: '移动或缩放图片',
  },
  editProfile: {
    title: '编辑身份资料',
    nickname: '昵称',
  },
  selectImage: {
    title: '插入图像',
    selectImage: '选择图片',
    selectFromImageLib: '从图库选择',
  },
  trxDetail: {
    title: '区块详情',
    clickToCopy: '点击复制',
    copied: '已复制',
    loadFailed: '数据获取失败',
    copyData: '复制区块数据',
  },
  imageZoom: {
    fitImage: '适应图片大小',
    shrink: '缩小',
    restore: '恢复图片本身大小',
    expand: '放大',
    rotateRight: '向右旋转',
  },
  imageLib: {
    keywords: '关键词',
    tip: '图片由 Pixabay 提供，都是免费可自由使用的',
    noImages: [
      '没有搜索到相关的图片呢',
      '换个关键词试试',
      '也可以换英文试一试',
    ],
  },
  permission: {
    main: '您不持有具备发帖权限的 NFT',
    comment: '您不持有具备评论权限的 NFT',
    counter: '您没有评论互动权限',
    profile: '您没有提交个人资料的权限',
    login: '请先登录',
  },
  ago: {
    justNow: '刚刚',
    minutesAgo: '分钟前',
    hoursAgo: '小时前',
  },
};

export type Content = typeof content;
