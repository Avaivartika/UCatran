// Small DOM-only Markdown renderer: raw HTML is always text, links use host validation.
function inlineMarkdown(parent,text){
 const pattern=/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+)/g;let offset=0;
 for(const match of text.matchAll(pattern)){parent.append(document.createTextNode(text.slice(offset,match.index)));const value=match[0];
  if(value.startsWith('`'))parent.append(el('code','',value.slice(1,-1)));
  else if(value.startsWith('**'))parent.append(el('strong','',value.slice(2,-2)));
  else{const link=value.startsWith('[')?value.match(/^\[(.*?)\]\((.*?)\)$/):null;const a=el('a','',link?link[1]:value);a.href='#';a.onclick=e=>{e.preventDefault();api('openLink',{url:link?link[2]:value}).catch(e=>notice(e.message))};parent.append(a)}offset=match.index+value.length;
 }parent.append(document.createTextNode(text.slice(offset)));
}
function richText(container,text){
 container.classList.add('markdown');const lines=String(text).split('\n');
 for(let i=0;i<lines.length;){const line=lines[i];
  if(/^```/.test(line)){const code=[];i++;while(i<lines.length&&!/^```/.test(lines[i]))code.push(lines[i++]);i++;const pre=el('pre'),body=el('code','',code.join('\n'));pre.append(body);container.append(pre);continue}
  if(!line.trim()){i++;continue}
  if(line.includes('|')&&i+1<lines.length&&/^\s*\|?\s*:?-{3,}/.test(lines[i+1])){const table=el('table'),head=el('tr');const cells=s=>s.trim().replace(/^\||\|$/g,'').split('|');for(const cell of cells(line)){const th=el('th');inlineMarkdown(th,cell.trim());head.append(th)}table.append(head);i+=2;while(i<lines.length&&lines[i].includes('|')){const row=el('tr');for(const cell of cells(lines[i++])){const td=el('td');inlineMarkdown(td,cell.trim());row.append(td)}table.append(row)}const scroll=el('div','table-scroll');scroll.append(table);container.append(scroll);continue}
  const heading=line.match(/^(#{1,6})\s+(.*)$/),item=line.match(/^\s*(?:[-*+] |\d+[.)] )(.*)$/);
  if(item){const ordered=/^\s*\d/.test(line),list=el(ordered?'ol':'ul');while(i<lines.length){const next=lines[i].match(ordered?/^\s*\d+[.)] (.*)$/:/^\s*[-*+] (.*)$/);if(!next)break;const li=el('li');inlineMarkdown(li,next[1]);list.append(li);i++}container.append(list);continue}
  const node=el(heading?'h'+Math.min(heading[1].length+1,6):line.startsWith('>')?'blockquote':'p');inlineMarkdown(node,heading?heading[2]:line.replace(/^>\s?/,''));container.append(node);i++;
 }
}
