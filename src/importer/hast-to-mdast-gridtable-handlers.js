/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { all } from 'hast-util-to-mdast';
import {
  TYPE_BODY,
  TYPE_CELL,
  TYPE_FOOTER,
  TYPE_HEADER,
  TYPE_ROW,
  TYPE_TABLE,
} from '@adobe/helix-markdown-support/gridtable';

function convert(type) {
  return (h, node) => h(node, type, all(h, node));
}

function table(h, node) {
  let children = all(h, node);

  // people never create <thead> or <tbody>, but only use a <th> to mark the cell (row) as header
  // which is technically wrong, since also a column can be a header. however the default sanitized
  // dom will always have a <tbody> so we need move rows that have a <th> cell into the table head.
  if (!children.find(({ type }) => type === TYPE_HEADER)) {
    const head = [];
    const body = [];

    const shove = (r) => {
      if (r.hasHeaderCell) {
        head.push(r);
      } else {
        body.push(r);
      }
      // eslint-disable-next-line no-param-reassign
      delete r.hasHeaderCell;
    };

    for (const child of children) {
      if (child.type === TYPE_ROW) {
        shove(child);
      } else {
        child.children.forEach(shove);
      }
    }
    children = [];
    if (head.length) {
      children.push(h(node, TYPE_HEADER, head));
    }
    if (body.length) {
      children.push(h(node, TYPE_BODY, body));
    }
  }
  return h(node, TYPE_TABLE, children);
}

function row(h, node) {
  const mdast = h(node, TYPE_ROW, all(h, node));
  mdast.hasHeaderCell = node.hasHeaderCell;
  return mdast;
}

function cell(h, node, parent) {
  const ATTR_MAP = {
    align: 'align',
    valign: 'valign',
    rowspan: 'rowSpan',
    colspan: 'colSpan',
  };
  if (node.tagName === 'th') {
    // eslint-disable-next-line no-param-reassign
    parent.hasHeaderCell = true;
  }
  const props = {};
  if (node.properties) {
    for (const [key, value] of Object.entries(node.properties)) {
      const lKey = key.toLowerCase();
      if (lKey in ATTR_MAP) {
        props[ATTR_MAP[lKey]] = value;
      }
    }
  }
  return h(node, TYPE_CELL, props, all(h, node));
}

export default {
  table,
  thead: convert(TYPE_HEADER),
  tbody: convert(TYPE_BODY),
  tfoot: convert(TYPE_FOOTER),
  tr: row,
  td: cell,
  th: cell,
};
