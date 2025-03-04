// type is either success or error

export const hideAlert = () => {
  const el = document.querySelector('.alert');
  if (el) el.parentElement.removeChild(el);
};

export const showAlert = (type, msg) => {
  hideAlert();

  const markup = document.createElement('div');
  markup.classList.add(`alert`, `alert--${type}`);
  markup.innerText = msg;

  document.querySelector('body').insertAdjacentElement('afterbegin', markup);

  window.setTimeout(hideAlert, 5000);
};
