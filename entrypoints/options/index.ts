const picker = document.getElementById('default-color') as HTMLInputElement;
const save = document.getElementById('save') as HTMLButtonElement;

const COLOR_KEY = 'cbe:color';

save.addEventListener('click', async () => {
  await chrome.storage.local.set({ [COLOR_KEY]: picker.value });
  save.textContent = 'Saved!';
  setTimeout(() => (save.textContent = 'Save'), 1200);
});

chrome.storage.local.get(COLOR_KEY).then(({ [COLOR_KEY]: color }) => {
  if (typeof color === 'string') picker.value = color;
});
