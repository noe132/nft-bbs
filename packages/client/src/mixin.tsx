// window.parent.postMessage({
//   name: 'mixin-login-message',
//   search: window.location.search,
// });

window.localStorage.removeItem('mixin-login-callback');
window.localStorage.setItem('mixin-login-callback', window.location.search);
window.localStorage.removeItem('mixin-login-callback');
window.close();
