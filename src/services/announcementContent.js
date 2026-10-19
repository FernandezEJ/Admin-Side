// No HTML is stored or rendered. Version 1 supports flat paragraphs and lists.
export function validDocument(value) {
  const keys = (node, allowed) => node && typeof node === 'object' && !Array.isArray(node) && Object.keys(node).every((key) => allowed.includes(key));
  let runs = 0, items = 0, length = 0;
  const inline = (content) => Array.isArray(content) && content.every((run) => {
    if (!keys(run, ['text', 'bold', 'italic']) || typeof run.text !== 'string' || ++runs > 1000) return false;
    length += run.text.length;
    return length <= 10000 && ['bold', 'italic'].every((mark) => run[mark] === undefined || typeof run[mark] === 'boolean');
  });
  return keys(value, ['version', 'blocks']) && value.version === 1 && Array.isArray(value.blocks) && value.blocks.length <= 100 && value.blocks.every((block) =>
    block?.type === 'paragraph' ? keys(block, ['type', 'content']) && inline(block.content) :
      ['bullet_list', 'ordered_list'].includes(block?.type) && keys(block, ['type', 'items']) && Array.isArray(block.items) && block.items.length > 0 &&
      block.items.every((content) => ++items <= 100 && inline(content)));
}

export const plainDocument = (text = '') => ({ version: 1, blocks: [{ type: 'paragraph', content: [{ text }] }] });
export const announcementDocument = (item) => validDocument(item.description_document) ? item.description_document : plainDocument(item.description || '');
export const documentText = (document) => document.blocks.map((block) => block.type === 'paragraph' ? block.content.map((run) => run.text).join('') :
  block.items.map((content, index) => `${block.type === 'ordered_list' ? `${index + 1}.` : '•'} ${content.map((run) => run.text).join('')}`).join('\n')).join('\n\n');

export const blankParagraph = (block) => block.type === 'paragraph' && block.content.every((run) => /^[\r\n]*$/.test(run.text));
export function announcementContentError(value, required = false) {
  if (!validDocument(value) || documentText(value).length > 10000) return 'Keep the description within 10,000 characters and 100 paragraphs/list items.';
  const text = value.blocks.flatMap((block) => block.type === 'paragraph' ? block.content : block.items.flat()).map((run) => run.text).join('');
  return required && !text.replace(/[\s\u200b-\u200d\ufeff]/g, '') ? 'Enter an announcement description.' : '';
}

const ignored = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'TEMPLATE', 'IMG', 'VIDEO', 'AUDIO', 'INPUT', 'BUTTON']);
const containers = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'PRE']);

// Read only text/semantic formatting from the inert paste DOM or editor DOM.
export function documentFromDOM(root) {
  const blocks = [];
  const inline = (node, marks = {}) => {
    if (node.nodeType === 3) return node.textContent ? [{ text: node.textContent, ...marks }] : [];
    if (node.nodeType !== 1 || ignored.has(node.tagName)) return [];
    if (node.tagName === 'BR') return [{ text: '\n', ...marks }];
    const next = { ...marks };
    if (['B', 'STRONG'].includes(node.tagName) || ['bold', '700'].includes(node.style?.fontWeight)) next.bold = true;
    if (['I', 'EM'].includes(node.tagName) || node.style?.fontStyle === 'italic') next.italic = true;
    return [...node.childNodes].flatMap((child) => inline(child, next));
  };
  let pending = [];
  const flush = () => { if (pending.length) { blocks.push({ type: 'paragraph', content: pending }); pending = []; } };
  const visit = (node) => {
    if (node.nodeType === 1 && ignored.has(node.tagName)) return;
    if (node.nodeType === 1 && ['UL', 'OL'].includes(node.tagName)) {
      flush();
      let items = [];
      const finishList = () => {
        if (items.length) blocks.push({ type: node.tagName === 'OL' ? 'ordered_list' : 'bullet_list', items });
        items = [];
      };
      [...node.children].filter((child) => child.tagName === 'LI').forEach((child) => {
        // Browsers can nest pasted lists inside the current list item. Flatten
        // those blocks while retaining each paragraph and each list's kind.
        if (child.querySelector('ul,ol')) {
          finishList(); [...child.childNodes].forEach(visit); flush();
        } else items.push(inline(child));
      });
      finishList();
    } else if (node.nodeType === 1 && containers.has(node.tagName)) {
      flush();
      if ([...node.children].some((child) => containers.has(child.tagName) || ['UL', 'OL'].includes(child.tagName))) {
        [...node.childNodes].forEach(visit); flush();
      } else {
        // A lone BR is the browser's caret placeholder, not a typed newline.
        const content = node.textContent === '' && node.querySelectorAll('br').length === 1 ? [] : inline(node);
        blocks.push({ type: 'paragraph', content });
      }
    } else pending.push(...inline(node));
  };
  [...root.childNodes].forEach(visit); flush();
  return { version: 1, blocks };
}

export function documentDOM(value, owner = document) {
  const fragment = owner.createDocumentFragment();
  const append = (parent, content) => content.forEach((run) => {
    let node = owner.createTextNode(run.text);
    if (run.italic) { const wrap = owner.createElement('em'); wrap.append(node); node = wrap; }
    if (run.bold) { const wrap = owner.createElement('strong'); wrap.append(node); node = wrap; }
    parent.append(node);
  });
  value.blocks.forEach((block) => {
    const node = owner.createElement(block.type === 'paragraph' ? 'p' : block.type === 'ordered_list' ? 'ol' : 'ul');
    if (block.type === 'paragraph') {
      append(node, block.content);
      // Empty text nodes count as children but cannot anchor the initial caret.
      if (!node.textContent) node.append(owner.createElement('br'));
      if (blankParagraph(block)) node.dataset.emptyParagraph = 'true';
    }
    else block.items.forEach((content) => { const li = owner.createElement('li'); append(li, content); node.append(li); });
    fragment.append(node);
  });
  return fragment;
}
