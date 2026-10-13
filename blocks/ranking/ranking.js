/*
 * Ranking Block
 * Renders the CSS Battle leaderboard (podium + list) from a spreadsheet
 * published as JSON.
 *
 * Authoring contract:
 * - Optionally add a link to the sheet inside the block; the default is /ranking.json.
 * - Sheet columns: "Nome", "Avatar" (image URL, optional) and one column per
 *   day (any header, e.g. "Dia 1"). The total is the sum of the days.
 * - An optional image authored inside the block is the default avatar for rows
 *   without one; with neither, a CSS-drawn silhouette is shown.
 * - Tied participants are never split: a tie group is either fully on the
 *   podium (up to 3 people) or fully in the list. With no points, no podium.
 */

const DEFAULT_SOURCE = '/ranking.json';
const PODIUM_SIZE = 3;
const NAME_COLUMN = 'Nome';
const AVATAR_COLUMN = 'Avatar';

function toNumber(value) {
  const text = String(value ?? '').trim().replace(',', '.');
  return text === '' || Number.isNaN(Number(text)) ? null : Number(text);
}

function parseParticipants({ data: rows = [], columns = Object.keys(rows[0] ?? {}) }) {
  const dayColumns = columns.filter((column) => column.trim()
    && ![NAME_COLUMN, AVATAR_COLUMN].includes(column));

  return rows
    .map((row) => {
      const days = dayColumns.map((column) => ({
        label: column.trim(),
        value: toNumber(row[column]),
      }));
      return {
        name: String(row[NAME_COLUMN] ?? '').trim(),
        avatar: String(row[AVATAR_COLUMN] ?? '').trim(),
        total: days.reduce((sum, day) => sum + (day.value ?? 0), 0),
        days,
      };
    })
    .filter((participant) => participant.name)
    .sort((x, y) => y.total - x.total);
}

function assignRanks(participants) {
  let lastTotal = null;
  let lastRank = 0;
  return participants.map((participant, index) => {
    const rank = participant.total === lastTotal ? lastRank : index + 1;
    lastTotal = participant.total;
    lastRank = rank;
    return { ...participant, rank };
  });
}

function getPodiumSize(participants) {
  if (participants[0].total <= 0) return 0;
  let size = 0;
  while (size < participants.length) {
    const { rank } = participants[size];
    let end = size;
    while (end < participants.length && participants[end].rank === rank) end += 1;
    if (end > PODIUM_SIZE) break;
    size = end;
  }
  return size;
}

function formatNumber(value) {
  return value.toLocaleString('pt-BR');
}

function createElement(tag, className, text = '') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function buildAvatar(participant, defaultAvatar, crowned) {
  const wrap = createElement('div', 'ranking-avatar-wrap');
  if (crowned) {
    const crown = createElement('span', 'ranking-crown');
    crown.setAttribute('aria-hidden', 'true');
    wrap.append(crown);
  }

  const avatar = createElement('div', 'ranking-avatar');
  const src = participant.avatar || defaultAvatar;
  if (src) {
    const img = document.createElement('img');
    img.loading = 'lazy';
    img.src = src;
    img.alt = participant.avatar ? participant.name : '';
    avatar.append(img);
  } else {
    avatar.classList.add('ranking-avatar-placeholder');
    avatar.setAttribute('aria-hidden', 'true');
  }
  wrap.append(avatar);
  return wrap;
}

function buildRank({ rank }, podium) {
  const visual = createElement('span', '', podium ? rank : `#${rank}`);
  visual.setAttribute('aria-hidden', 'true');
  const rankEl = createElement('div', 'ranking-rank');
  rankEl.append(visual, createElement('span', 'ranking-sr-only', `${rank}º lugar`));
  return rankEl;
}

function buildDays({ days }) {
  const list = createElement('div', 'ranking-days');
  days.forEach(({ label, value }) => {
    const chip = createElement('span', 'ranking-day');
    chip.append(
      createElement('span', 'ranking-day-label', label),
      createElement('span', 'ranking-day-value', value === null ? '–' : formatNumber(value)),
    );
    list.append(chip);
  });
  return list;
}

function buildTotal({ total }) {
  const wrap = createElement('div', 'ranking-total');
  wrap.append(
    createElement('span', 'ranking-total-value', formatNumber(total)),
    createElement('span', 'ranking-total-label', 'pts'),
  );
  return wrap;
}

function buildItem(participant, index, defaultAvatar, podium) {
  const li = createElement('li', podium ? 'ranking-podium-item' : 'ranking-item');
  if (podium) li.classList.add(`ranking-rank-${participant.rank}`);
  li.style.setProperty('--ranking-i', index);

  const crowned = podium && participant.rank === 1;
  const avatar = buildAvatar(participant, defaultAvatar, crowned);
  const rank = buildRank(participant, podium);
  const name = createElement('div', 'ranking-name', participant.name);
  const total = buildTotal(participant);

  if (podium) {
    avatar.append(rank);
    li.append(avatar, name, total);
  } else {
    li.append(rank, avatar, name, total);
  }
  if (participant.days.length > 0) li.append(buildDays(participant));
  return li;
}

function buildList(className, participants, offset, defaultAvatar, podium) {
  const list = createElement('ol', className);
  list.start = offset + 1;
  participants.forEach((participant, index) => {
    list.append(buildItem(participant, offset + index, defaultAvatar, podium));
  });
  return list;
}

function renderMessage(block, className, text) {
  block.replaceChildren(createElement('p', className, text));
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  let source = DEFAULT_SOURCE;
  if (link) {
    const url = new URL(link.href, window.location.href);
    source = `${url.pathname}${url.search}`;
  }
  const defaultAvatar = block.querySelector('img')?.src || '';
  block.textContent = '';

  try {
    const resp = await fetch(source);
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    const participants = assignRanks(parseParticipants(await resp.json()));

    if (participants.length === 0) {
      renderMessage(block, 'ranking-empty', 'Ranking em breve. Volte mais tarde para conferir a pontuação! 🎮');
      return;
    }

    const podiumSize = getPodiumSize(participants);
    if (podiumSize > 0) {
      block.append(buildList('ranking-podium', participants.slice(0, podiumSize), 0, defaultAvatar, true));
    }
    if (podiumSize < participants.length) {
      block.append(buildList('ranking-list', participants.slice(podiumSize), podiumSize, defaultAvatar, false));
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Ranking: failed to load data from', source, error);
    renderMessage(block, 'ranking-error', 'Não foi possível carregar o ranking agora. Tente novamente em instantes.');
  }
}
