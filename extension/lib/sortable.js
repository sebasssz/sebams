export function placeLink(links,sourceId,targetId,after=false,{pinnedOnly=false}={}){
  const source=links.find(l=>l.id===sourceId),target=links.find(l=>l.id===targetId);
  if(!source||!target)throw Error('This shortcut changed in another tab. Try again.');
  if(sourceId===targetId)return;
  if(pinnedOnly&&(!source.pinned||!target.pinned))throw Error('This shortcut is no longer pinned.');
  if(!pinnedOnly&&source.folder!==target.folder)throw Error('Drag within the same folder. Use Manage links to change a folder.');
  const matches=l=>pinnedOnly?l.pinned:l.folder===source.folder;
  const indexes=links.flatMap((l,i)=>matches(l)?[i]:[]),items=indexes.map(i=>links[i]);
  items.splice(items.findIndex(l=>l.id===sourceId),1);
  const destination=items.findIndex(l=>l.id===targetId)+(after?1:0);items.splice(destination,0,source);
  indexes.forEach((index,i)=>{links[index]=items[i];});
}
// A drag begins only inside this container. URLs/data from other pages are ignored.
export function bindSortable(container,{reorder,run,refreshContainer=()=>container}){
  let source=null,drop=null,suppressUntil=0;
  const item=target=>target instanceof Element?target.closest('[data-sort-id]'):null;
  const clean=()=>{for(const row of container.querySelectorAll('[data-sort-id]'))row.classList.remove('dragging','drop-before','drop-after');drop=null;};
  const focus=id=>{const row=[...refreshContainer()?.querySelectorAll('[data-sort-id]')||[]].find(n=>n.dataset.sortId===id);row?.querySelector('a,button')?.focus({preventScroll:true});};
  container.addEventListener('dragstart',event=>{const row=item(event.target);if(!row||!container.contains(row)||event.target.closest('button:not(.shortcut-grip)')){event.preventDefault();return;}source=row.dataset.sortId;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('application/x-sebams-shortcut',source);row.classList.add('dragging');});
  container.addEventListener('dragover',event=>{const row=item(event.target);if(!source||!row||!container.contains(row)||row.dataset.sortId===source)return;event.preventDefault();event.dataTransfer.dropEffect='move';const after=event.clientY>row.getBoundingClientRect().top+row.getBoundingClientRect().height/2;for(const node of container.querySelectorAll('.drop-before,.drop-after'))node.classList.remove('drop-before','drop-after');row.classList.add(after?'drop-after':'drop-before');drop={id:row.dataset.sortId,after};});
  container.addEventListener('drop',run(async event=>{if(!source||!drop)return;event.preventDefault();const id=source,destination=drop;source=null;suppressUntil=Date.now()+400;clean();await reorder(id,destination.id,destination.after);focus(id);}));
  container.addEventListener('dragend',()=>{source=null;suppressUntil=Date.now()+400;clean();});
  container.addEventListener('click',event=>{if(Date.now()<suppressUntil){event.preventDefault();event.stopPropagation();}},true);
  container.addEventListener('keydown',run(async event=>{if(!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;const row=item(event.target);if(!row)return;event.preventDefault();const rows=[...container.querySelectorAll('[data-sort-id]')],index=rows.indexOf(row),next=rows[index+(event.key==='ArrowUp'?-1:1)];if(!next)return;await reorder(row.dataset.sortId,next.dataset.sortId,event.key==='ArrowDown');focus(row.dataset.sortId);}));
}
