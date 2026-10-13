import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Groups the footer content into columns: each heading starts a new column.
 * @param {Element} fragment The loaded footer fragment
 * @returns {Element[]} The column elements
 */
function buildColumns(fragment) {
  const columns = [];
  fragment.querySelectorAll('.default-content-wrapper > *').forEach((element) => {
    if (/^H[1-6]$/.test(element.tagName) || columns.length === 0) {
      const column = document.createElement('div');
      column.className = 'footer-column';
      columns.push(column);
    }
    columns[columns.length - 1].append(element);
  });
  return columns;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // load footer as fragment
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  block.textContent = '';
  const footer = document.createElement('div');
  footer.append(...buildColumns(fragment));

  block.append(footer);
}
