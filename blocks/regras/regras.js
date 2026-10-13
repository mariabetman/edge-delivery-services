/*
 * Regras Block
 * Renders rule cards.
 *
 * Authoring contract: one row per rule.
 * - Three or more columns: icon (image or emoji), title, then the description.
 * - Two columns: title and description; the card shows its number instead of an icon.
 * - One column: its first element is the title, the remaining elements are the description.
 */

function buildIcon(cell) {
  const picture = cell.querySelector('picture, img');
  const text = cell.textContent.trim();
  if (!picture && !text) return null;

  const icon = document.createElement('div');
  icon.className = 'regras-icon';
  icon.setAttribute('aria-hidden', 'true');
  if (picture) icon.append(picture.closest('picture') || picture);
  else icon.textContent = text;
  return icon;
}

function splitRow(row) {
  const cells = [...row.children];
  if (cells.length >= 3) {
    return {
      icon: buildIcon(cells[0]),
      title: cells[1].textContent.trim(),
      body: cells.slice(2).flatMap((cell) => [...cell.children]),
    };
  }
  if (cells.length === 2) {
    return {
      icon: null,
      title: cells[0].textContent.trim(),
      body: [...cells[1].children],
    };
  }
  const [first, ...others] = cells.length ? [...cells[0].children] : [];
  return { icon: null, title: first ? first.textContent.trim() : '', body: others };
}

export default function decorate(block) {
  const list = document.createElement('ol');
  list.className = 'regras-list';

  [...block.children].forEach((row) => {
    const { icon, title, body } = splitRow(row);
    if (!title && body.length === 0) return;

    const item = document.createElement('li');
    item.className = 'regras-item';

    if (icon) {
      item.classList.add('regras-item-icon');
      item.append(icon);
    }

    if (title) {
      const heading = document.createElement('h3');
      heading.className = 'regras-title';
      heading.textContent = title;
      item.append(heading);
    }

    if (body.length > 0) {
      const text = document.createElement('div');
      text.className = 'regras-text';
      text.append(...body);
      item.append(text);
    }

    list.append(item);
  });

  block.replaceChildren(list);
}
