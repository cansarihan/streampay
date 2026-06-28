import{r,j as t}from"./vendor-Dh9ngdZo.js";import{c,h as i}from"./index-DTIWXPoV.js";import{C as n}from"./external-link-BwvqxscH.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=c("Check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);function x({value:s,className:a}){const[o,e]=r.useState(!1);return t.jsx("button",{type:"button","aria-label":"Copy",onClick:async()=>{try{await navigator.clipboard.writeText(s),e(!0),setTimeout(()=>e(!1),1500)}catch{}},className:i("text-fg-subtle transition hover:text-fg",a),children:o?t.jsx(p,{className:"size-3.5 text-positive"}):t.jsx(n,{className:"size-3.5"})})}export{x as C};
