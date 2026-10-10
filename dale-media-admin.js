(()=>{
"use strict";
const $=id=>document.getElementById(id),db=window.supabase?.createClient("https://mjsoffmcekzhenuyfzud.supabase.co",window.DALE_SUPABASE_KEY);
let authorized=false,gallery=[],reviews=[],galleryAll=false,reviewsAll=false;
const node=(tag,cls="",text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n};
const action=(caption,callback,cls="mini")=>{const b=node("button",cls,caption);b.type="button";b.onclick=callback;return b};
const target=$("mediaManagement");
const status=node("p","panel-note","");
function show(s,error=false){status.textContent=s;status.style.color=error?"#FFA89B":"#DCC09F"}
async function load(){
 if(!authorized||!db)return;
 const [photos,comments]=await Promise.all([
  db.from("dale_gallery").select("id,image_path,caption,is_published,display_order,created_at").order("created_at",{ascending:false}).limit(200),
  db.from("dale_testimonials").select("id,player_name,rating,quote,anonymous,approved,created_at").order("created_at",{ascending:false}).limit(200)
 ]);
 if(photos.error||comments.error){show(photos.error?.message||comments.error?.message,true);return}
 gallery=photos.data||[];reviews=comments.data||[];render()
}
function render(){
 if(!authorized)return;target.replaceChildren();
 const layout=node("div","media-admin-grid");
 const photoPanel=node("div"),testimonialPanel=node("div");
 const photoTitle=node("h3","","Photo Carousel");photoPanel.append(photoTitle);
 const desc=node("p","panel-note","Upload original JPG/PNG (maximum 5 MB). No WebP conversion. Published photos appear on the public gallery.");
 photoPanel.append(desc);
 const form=node("form","media-upload");const imageInput=node("input");imageInput.type="file";imageInput.accept=".jpg,.jpeg,.png,image/jpeg,image/png";imageInput.required=true;
 const captionInput=node("input");captionInput.type="text";captionInput.maxLength=250;captionInput.placeholder="Caption (optional)";
 const submit=node("button","primary","UPLOAD PHOTO");submit.type="submit";
 form.append(imageInput,captionInput,submit);
 form.onsubmit=async e=>{e.preventDefault();if(!authorized||!imageInput.files?.length)return;const file=imageInput.files[0];if(!["image/jpeg","image/png"].includes(file.type)||file.size>5242880){show("Please choose a JPG or PNG under 5 MB.",true);return}
  submit.disabled=true;show("Uploading photo…");
  const ext=file.type==="image/png"?"png":"jpg",path="gallery/"+Date.now()+"-"+crypto.randomUUID()+"."+ext;
  const a=await db.storage.from("dale-gallery").upload(path,file,{contentType:file.type,upsert:false});
  if(a.error){show("Upload failed: "+a.error.message,true);submit.disabled=false;return}
  const b=await db.from("dale_gallery").insert({image_path:path,caption:captionInput.value.trim(),is_published:true});
  if(b.error){await db.storage.from("dale-gallery").remove([path]);show("Unable to publish photo: "+b.error.message,true)}
  else{show("Photo uploaded and published!");await load()}
  submit.disabled=false
 };
 photoPanel.append(form);
 const rows=node("div","media-items"),shown=galleryAll?gallery:gallery.slice(0,3);
 for(const p of shown){const row=node("div","media-row");const img=node("img");img.alt=p.caption||"Training photo";img.loading="lazy";img.src=db.storage.from("dale-gallery").getPublicUrl(p.image_path).data.publicUrl;
  const body=node("div");body.append(node("h4","",p.caption||"Training photo"),node("p","",p.is_published?"Published":"Hidden"));
  const buttons=node("div","media-actions");
  buttons.append(action(p.is_published?"Hide":"Publish",async()=>{const r=await db.from("dale_gallery").update({is_published:!p.is_published}).eq("id",p.id);if(r.error)show(r.error.message,true);else await load()}));
  buttons.append(action("Remove",async()=>{if(!confirm("Delete this photo?"))return;const r=await db.from("dale_gallery").delete().eq("id",p.id);if(r.error){show(r.error.message,true);return}const st=await db.storage.from("dale-gallery").remove([p.image_path]);if(st.error)show("Removed listing; cleanup needed: "+st.error.message,true);else show("Photo removed");await load()}));
  body.append(buttons);row.append(img,body);rows.append(row)
 }
 if(!gallery.length)rows.append(node("div","empty","No carousel images yet. Upload your first PNG/JPG above."));
 photoPanel.append(rows);
 if(gallery.length>3)photoPanel.append(action(galleryAll?"SHOW LESS":"SHOW ALL ("+gallery.length+")",()=>{galleryAll=!galleryAll;render()},"ghost"));
 testimonialPanel.append(node("h3","","Testimonials & Approval"));
 const waiting=reviews.filter(x=>!x.approved).length;
 testimonialPanel.append(node("p","panel-note",waiting+" testimonial(s) waiting for approval."));
 const items=node("div","media-items");
 for(const r of (reviewsAll?reviews:reviews.slice(0,3))){const card=node("div","card");
  card.append(node("h4","",r.player_name+" · "+"★".repeat(r.rating)));
  card.append(node("p","",r.quote),node("small","",r.approved?"Published":r.anonymous?"Pending · display Anonymous":"Pending review"));
  const buttons=node("div","media-actions");
  buttons.append(action(r.approved?"Unpublish":"Approve",async()=>{const x=await db.from("dale_testimonials").update({approved:!r.approved}).eq("id",r.id);if(x.error)show(x.error.message,true);else await load()}));
  buttons.append(action("Delete",async()=>{if(!confirm("Delete this testimonial permanently?"))return;const x=await db.from("dale_testimonials").delete().eq("id",r.id);if(x.error)show(x.error.message,true);else await load()}));
  card.append(buttons);items.append(card)
 }
 if(!reviews.length)items.append(node("div","empty","No testimonials submitted yet."));
 testimonialPanel.append(items);
 if(reviews.length>3)testimonialPanel.append(action(reviewsAll?"SHOW LESS":"SHOW ALL ("+reviews.length+")",()=>{reviewsAll=!reviewsAll;render()},"ghost"));
 layout.append(photoPanel,testimonialPanel);target.append(status,layout)
}
function setAuthorized(value){authorized=!!value;if(value)load();else{gallery=[];reviews=[];target.replaceChildren()}}
window.DaleMedia={load,setAuthorized};
})();