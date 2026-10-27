import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, createRoutesFromElements, matchRoutes } from 'react-router-dom';

export async function checkEducation(server) {
  const { createEducationalArticles, educationalArticlesApi } = await server.ssrLoadModule('/src/services/educationalArticlesApi.js');
  const { EducationalContentView } = await server.ssrLoadModule('/src/pages/EducationalContent.jsx');
  const { EducationalArticleDetailView } = await server.ssrLoadModule('/src/pages/EducationalArticleDetail.jsx');
  const { EducationalArticleFormView } = await server.ssrLoadModule('/src/pages/EducationalArticleForm.jsx');
  const { default: ArticlePopup, EducationalArticlePopupView } = await server.ssrLoadModule('/src/components/announcements/EducationalArticlePopup.jsx');
  const { protectEducationalPopup } = await server.ssrLoadModule('/src/services/educationalPopupHistory.js');
  const { ArticleCover } = await server.ssrLoadModule('/src/components/announcements/EducationalArticlePreview.jsx');
  const { default: AdminDialog } = await server.ssrLoadModule('/src/components/ui/AdminDialog.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const { navigationItems } = await server.ssrLoadModule('/src/components/layout/navigation.js');
  const { hasRole } = await server.ssrLoadModule('/src/auth/roles.js');
  const { AppRoutes } = await server.ssrLoadModule('/src/AppRoutes.jsx');
  const categories = {blood_basics:'Blood Basics',donor_tips:'Donor Tips',donation_guide:'Donation Guide',myths_facts:'Myths & Facts'};
  const document = {version:1,blocks:[{type:'paragraph',content:[{text:'Full <script>safe text</script>',bold:true}]}]};
  const item = {id:1,title:'Saved article',category:'blood_basics',category_label:'Blood Basics',short_description:'Short preview',description:'Full safe text',description_document:document,status:'draft',image_url:'https://media.test/cover.png'};
  const meta={current_page:1,last_page:1,total:1,per_page:20};
  const descendants = element => !React.isValidElement(element) ? [] : [element,...React.Children.toArray(element.props.children).flatMap(descendants)];
  const wrap = (component, role='admin') => renderToString(React.createElement(MemoryRouter,null,React.createElement(AdminSessionContext.Provider,{value:{role,currentAdmin:{name:'Staff'}}},component)));
  const deferred = () => {let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
  let pending=deferred(),reads=0,writes=0;
  const fake={list:async()=>{reads++;return pending.promise;},detail:async()=>{reads++;return pending.promise;},categories:async()=>({categories}),save:async()=>{writes++;return pending.promise;},action:async()=>{writes++;return pending.promise;}};
  const model=createEducationalArticles(operation=>operation('staff'),undefined,'published',fake);
  let request=model.load();model.load();assert.equal(reads,1);pending.reject(new Error('Offline'));await request;assert.equal(model.getSnapshot().error,'Offline');assert.equal(model.getSnapshot().loading,false);
  pending=deferred();request=model.load();pending.resolve({data:[item],meta,counts:{published:0,draft:1,deleted:0},categories});await request;
  assert.equal(model.getSnapshot().items[0],item);
  pending=deferred();const stale=model.load({...model.getSnapshot().filters,status:'draft'});const old=pending;
  pending=deferred();request=model.load({...model.getSnapshot().filters,status:'deleted'});pending.resolve({data:[],meta:{...meta,total:0},counts:{},categories});await request;old.resolve({data:[item],meta,categories});await stale;assert.equal(model.getSnapshot().items.length,0);
  const detailModel=createEducationalArticles(operation=>operation('staff'),1,'published',fake);
  pending=deferred();request=detailModel.load();pending.resolve({article:item,categories});await request;
  pending=deferred();request=detailModel.action('publish');assert.equal(await detailModel.action('publish'),false);assert.equal(writes,1);
  pending.reject(Object.assign(new Error('Invalid cover'),{errors:{image:['Upload a cover.']}}));assert.equal(await request,false);assert.equal(detailModel.getSnapshot().item.status,'draft');assert.deepEqual(detailModel.getSnapshot().fieldErrors,{image:['Upload a cover.']});
  pending=deferred();request=detailModel.action('restore');pending.resolve({article:{...item,status:'draft'},categories});assert.equal(await request,true);assert.equal(detailModel.getSnapshot().item.status,'draft');
  pending=deferred();request=detailModel.save(item,null,'published');detailModel.dispose();pending.resolve({article:{...item,title:'Late mutation'},categories});assert.equal(await request,false);assert.equal(detailModel.getSnapshot().item.title,item.title);
  const previousFetch=globalThis.fetch,transport=[];
  globalThis.fetch=async(url,options)=>{transport.push({url,options});return Response.json({article:item,categories,data:[item],meta});};
  try {
    await educationalArticlesApi.list('staff',{status:'deleted',category:'blood_basics',search:'saved',page:2});
    await educationalArticlesApi.save('staff','create',item,new Blob(['image'],{type:'image/png'}),'draft');
    await educationalArticlesApi.save('staff',1,item,null,'published');await educationalArticlesApi.action('staff',1,'delete');await educationalArticlesApi.action('staff',1,'restore');
    assert.ok(transport[0].url.includes('status=deleted')&&transport[0].url.includes('page=2'));
    assert.equal(transport[1].options.body.get('status'),'draft');assert.equal(transport[1].options.body.get('short_description'),item.short_description);assert.ok(transport[1].options.body.has('image'));
    assert.deepEqual(JSON.parse(transport[1].options.body.get('description_document')),document);assert.equal(transport[2].options.body.get('_method'),'PUT');assert.equal(transport[3].options.method,'DELETE');assert.ok(transport[4].url.endsWith('/restore'));
    for(const key of ['donation_date','expires_at','notify_donors','image_path'])assert.equal(transport[1].options.body.has(key),false);
  } finally {globalThis.fetch=previousFetch;}
  const routes=createRoutesFromElements(AppRoutes().props.children);
  for(const path of ['/educational-content','/educational-content/create','/educational-content/1','/educational-content/1/edit'])assert.ok(matchRoutes(routes,path));
  for(const role of ['admin','super_admin']){
    assert.equal(navigationItems.filter(row=>row.path==='/educational-content'&&hasRole(role,row.allowedRoles)).length,1);
    for(const status of ['published','draft','deleted']){
      const remote={items:[{...item,status}],meta,counts:{published:1,draft:2,deleted:3},categories,filters:{status,search:'',category:'all',page:1},loading:false,error:'',model};
      const html=wrap(React.createElement(EducationalContentView,{remote}),role);assert.ok(html.includes('Educational Library')&&html.includes('New Article')&&html.includes('Saved article'));assert.ok(!html.includes('<table')&&!html.includes('Expired'));
      const detailHtml=wrap(React.createElement(EducationalArticleDetailView,{remote:{...remote,item:{...item,status},busy:false}}),role);
      assert.equal(detailHtml.includes('>Restore to Draft</button>'),status==='deleted');assert.equal(detailHtml.includes('>Publish</button>'),status==='draft');assert.equal(detailHtml.includes('>Edit</button>'),status!=='deleted');assert.equal(detailHtml.includes('>Delete</button>'),status!=='deleted');assert.ok(detailHtml.includes('&lt;script&gt;safe text&lt;/script&gt;')&&!detailHtml.includes('<script>safe text</script>'));
      const queries=[];
      function Gallery(){
        const tree=EducationalContentView({remote:{...remote,filters:{...remote.filters,search:'Existing query',category:'donor_tips',page:2},meta:{...meta,current_page:2,last_page:3},model:{load:value=>queries.push(value)}}});
        const list=descendants(tree),selectors=list.filter(node=>node.type==='button'&&typeof node.props['aria-pressed']==='boolean');
        assert.equal(selectors.length,3,'Summary cards are the only three status selectors');
        assert.equal(list.filter(node=>node.props['aria-label']==='Article status').length,1,'No duplicate status strip');
        for(const [index,card] of selectors.entries()){
          assert.equal(card.props.type,'button');assert.ok(card.props.className.includes('focus-visible:')&&card.props.className.includes('hover:'));
          assert.equal(descendants(card).find(node=>node.props.className?.includes('text-2xl')).props.children,index+1,'Counts come from API state');
          const cardHtml=renderToString(card);assert.ok(cardHtml.includes('lucide-chevron-right')&&cardHtml.includes('aria-hidden="true"'));
          assert.ok(card.props['aria-label'].includes(String(index+1)),'Count is included in the accessible name');
        }
        const selected=selectors.find(node=>node.props['aria-pressed']);
        selected.props.onClick();assert.equal(queries.length,0,'Reselecting the current status on page 2 does not fetch or reset pagination');
        for(const [index,card] of selectors.entries()){
          if(card===selected)continue;
          card.props.onClick();assert.deepEqual(queries.at(-1),{status:['published','draft','deleted'][index],search:'Existing query',category:'donor_tips',page:1});
        }
        const search=list.find(node=>node.props['aria-label']==='Search articles');
        assert.ok(search.props.className.includes('pl-10')&&search.props.className.includes('focus:'));
        assert.ok(list.some(node=>node.props.className?.includes('left-3')&&renderToString(node).includes('lucide-search')&&String(node.props['aria-hidden'])==='true'));
        assert.equal(search.props.value,'Existing query');search.props.onChange({target:{value:'New query'}});
        assert.deepEqual(queries.at(-1),{status,search:'New query',category:'donor_tips',page:1});
        list.find(node=>node.props['aria-label']==='Article category').props.onChange({target:{value:'blood_basics'}});
        assert.deepEqual(queries.at(-1),{status,search:'Existing query',category:'blood_basics',page:1});
        list.find(node=>node.type==='button'&&node.props.children==='Clear Filters').props.onClick();
        assert.deepEqual(queries.at(-1),{status,search:'',category:'all',page:1});
        list.find(node=>node.type==='button'&&node.props.children==='Next').props.onClick();
        assert.deepEqual(queries.at(-1),{status,search:'Existing query',category:'donor_tips',page:3});
        list.find(node=>node.type==='button'&&node.props.children==='Previous').props.onClick();
        assert.equal(queries.at(-1).page,1);
        const card=list.find(node=>node.props['aria-label']?.startsWith('Read article:'));
        assert.equal(card.props.type,'button');
        assert.equal(descendants(card).filter(node=>node.type==='button').length,1,'One card target, no nested View action');
        assert.ok(card.props.className.includes('hover:bg-primary-soft')&&card.props.className.includes('focus-visible:'));
        assert.ok(renderToString(card).includes('lucide-chevron-right'));
        assert.equal(typeof card.props.onClick,'function');
        const create=list.find(node=>node.type==='button'&&React.Children.toArray(node.props.children).includes('New Article'));
        assert.equal(create.props.type,'button');assert.equal(typeof create.props.onClick,'function');assert.ok(create.props.className.includes('px-5'));
        return tree;
      }
      wrap(React.createElement(Gallery),role);
    }
  }
  const formRemote={item:null,categories,loading:false,busy:false,error:'',fieldErrors:{},model:{...model,save:()=>{throw Error('Editing or cancelling must not save');}}};
  let stage=0;
  function LeaveExercise(){
    const tree=EducationalArticleFormView({remote:formRemote}),children=descendants(tree);
    assert.ok(!children.some(node=>node.type==='button'&&node.props.children==='Preview Article'));
    if(stage===0){stage++;children.find(node=>node.type==='input'&&node.props.maxLength===255).props.onChange({target:{value:'Unsaved article title'}});}
    else if(stage===1){stage++;children.find(node=>node.type==='button'&&node.props.children==='Cancel').props.onClick();}
    else if(stage===2){stage++;children.find(node=>node.type===AdminDialog&&node.props.title==='Discard unsaved changes?').props.onClose();}
    else if(stage===3){stage++;assert.ok(children.some(node=>node.type==='input'&&node.props.value==='Unsaved article title'));children.find(node=>node.type==='button'&&React.Children.toArray(node.props.children).includes('Back to Educational Content')).props.onClick();}
    else {assert.ok(children.some(node=>node.type===AdminDialog&&node.props.title==='Discard unsaved changes?'));}
    return tree;
  }
  const formHtml=wrap(React.createElement(LeaveExercise));assert.ok(formHtml.includes('Save as Draft')&&!formHtml.includes('type="date"'));assert.match(formHtml.replace(/<!--.*?-->/g,''),/0\/160 characters/);
  for(const entry of [null,item,{...item,status:'published'}]){
    const html=wrap(React.createElement(EducationalArticleFormView,{remote:{...formRemote,item:entry}}));
    assert.ok(!html.includes('Preview Article')&&!html.includes('Article Preview'),'No preview action or dialog in Create, Draft edit or Published edit');
    assert.equal(html.includes('Save as Draft'),entry?.status!=='published');assert.ok(html.includes(entry?.status==='published'?'Save Changes':'>Publish</button>'));
  }
  const liveHtml=wrap(React.createElement(EducationalArticleFormView,{remote:{...formRemote,item:{...item,status:'published'},busy:true}}));assert.ok(liveHtml.includes('This article is live')&&liveHtml.includes('Saving…')&&!liveHtml.includes('Save as Draft'));
  const createURL=URL.createObjectURL;URL.createObjectURL=()=> 'blob:education-test';let uploadStep=0;
  function UploadExercise(){
    const tree=EducationalArticleFormView({remote:formRemote}),children=descendants(tree),input=children.find(node=>node.type==='input'&&node.props.type==='file');
    if(uploadStep===0){uploadStep++;input.props.onChange({target:{files:[{type:'image/svg+xml',size:100}]}});}
    else if(uploadStep===1){uploadStep++;assert.ok(children.some(node=>node.props.role==='alert'&&String(node.props.children).includes('5 MB')));input.props.onChange({target:{files:[{type:'image/png',size:6*1024*1024}]}});}
    else if(uploadStep===2){uploadStep++;assert.ok(children.some(node=>node.props.role==='alert'));input.props.onChange({target:{files:[{type:'image/png',size:100}]}});}
    else {assert.equal(children.find(node=>node.type===ArticleCover).props.src,'blob:education-test','Selected cover still previews without an Article Preview dialog');}
    return tree;
  }
  try{wrap(React.createElement(UploadExercise));}finally{URL.createObjectURL=createURL;}
  const gallerySource=readFileSync('src/pages/EducationalContent.jsx','utf8');
  assert.ok(gallerySource.includes("openArticle('/educational-content/create')")&&gallerySource.includes('openDetails(article.id, event)'));
  assert.ok(gallerySource.includes('articleStatus: filters.status'),'Create and details receive the selected status');
  assert.ok(gallerySource.includes('pathname: location.pathname')&&gallerySource.includes('preventScrollReset: true'),'Popup history retains the gallery URL and scroll');
  for(const file of ['EducationalArticleForm.jsx','EducationalArticleDetail.jsx']){
    const source=readFileSync(`src/pages/${file}`,'utf8');assert.ok(source.includes('state?.articleStatus')&&source.includes('articleStatus: libraryStatus'),'Status survives Back, Edit and successful saves');
  }
  for(const role of ['admin','super_admin']){
    const remote={items:[item],meta:{...meta,current_page:2,last_page:3},counts:{draft:1},categories,filters:{status:'draft',search:'Saved',category:'blood_basics',page:2},loading:false,busy:false,error:'',model};
    let stage=0,focused=0,entries=0;
    function OpenCard(){
      const tree=EducationalContentView({remote,enterPopupHistory:id=>{assert.equal(id,item.id);entries++;}}),nodes=descendants(tree);
      const card=nodes.find(node=>node.props['aria-label']?.startsWith('Read article:'));
      assert.equal(card.props['aria-haspopup'],'dialog');
      if(stage++===0){card.props.onClick({currentTarget:{focus:()=>focused++}});card.props.onClick({currentTarget:{focus:()=>assert.fail('Duplicate open')}});}
      else {
        const popup=nodes.find(node=>node.type===ArticlePopup);assert.equal(popup.props.id,item.id);
        assert.equal(nodes.find(node=>node.props['aria-label']==='Search articles').props.value,'Saved');
        assert.ok(nodes.some(node=>node.props['aria-label']==='Educational article gallery'));
        assert.equal(nodes.find(node=>node.props['aria-label']==='Article category').props.value,'blood_basics');
        assert.equal(nodes.find(node=>node.type==='button'&&node.props['aria-pressed']).props['aria-label'],'Show Drafts articles: 1');
      }
      return tree;
    }
    const html=wrap(React.createElement(OpenCard),role);assert.equal(focused,1);assert.equal(entries,1);assert.ok(html.includes('<dialog'));
    assert.deepEqual(remote.filters,{status:'draft',search:'Saved',category:'blood_basics',page:2});
    let editing=0;
    function EditPopup(){
      const tree=EducationalArticlePopupView({remote:{...remote,item},onDismiss(){},onChanged(){}}),nodes=descendants(tree);
      assert.equal(nodes.filter(node=>node.type===AdminDialog).length,1,'One managed modal shell');
      if(editing++===0)nodes.find(node=>node.type===EducationalArticleDetailView).props.onEdit();
      else {assert.ok(nodes.find(node=>node.type===EducationalArticleFormView).props.popup);assert.equal(nodes.find(node=>node.type===AdminDialog).props.title,'Edit Article');}
      return tree;
    }
    const editHtml=wrap(React.createElement(EditPopup),role);assert.equal((editHtml.match(/<dialog\b/g)||[]).length,1);assert.ok(editHtml.includes('Save as Draft')&&!editHtml.includes('Preview Article'));
    let changed=0,step=0;
    function EditDetails(){
      const tree=EducationalArticleDetailView({remote:{...remote,item},popup:true,onClose(){},onEdit:()=>changed++,onChanged(){}}),nodes=descendants(tree);
      if(step++===0)nodes.find(node=>node.type==='button'&&node.props.children==='Edit').props.onClick();
      return tree;
    }
    wrap(React.createElement(EditDetails),role);assert.equal(changed,1,'Edit delegates to modal mode, not routing');
    let discardStep=0,closed=0;
    function DirtyModal(){
      const tree=EducationalArticleFormView({remote:{...formRemote,item},popup:true,onClose:()=>closed++}),nodes=descendants(tree);
      if(discardStep===0){discardStep++;nodes.find(node=>node.type==='input'&&node.props.maxLength===255).props.onChange({target:{value:'Unsaved modal title'}});}
      else if(discardStep===1){discardStep++;nodes.find(node=>node.type==='button'&&node.props.children==='Cancel').props.onClick();}
      else if(discardStep===2){discardStep++;assert.equal(nodes.find(node=>node.type==='form').props.hidden,true);assert.ok(nodes.some(node=>node.props['aria-label']==='Discard unsaved changes?'));assert.equal(nodes.filter(node=>node.type===AdminDialog).length,0,'No nested confirmation dialog');nodes.find(node=>node.type==='button'&&node.props.children==='Keep Editing').props.onClick();}
      else if(discardStep===3){discardStep++;assert.ok(nodes.some(node=>node.type==='input'&&node.props.value==='Unsaved modal title'));assert.equal(nodes.find(node=>node.type==='form').props.hidden,false);nodes.find(node=>node.type==='button'&&node.props.children==='Cancel').props.onClick();}
      else nodes.find(node=>node.type==='button'&&node.props.children==='Discard Changes').props.onClick();
      return tree;
    }
    wrap(React.createElement(DirtyModal),role);assert.equal(closed,1);
    for(const status of ['published','draft','deleted']){
      let actionStep=0;
      const actionLabel=status==='draft'?'Publish':status==='published'?'Delete':'Restore to Draft';
      function ConfirmAction(){
        const tree=EducationalArticleDetailView({remote:{...remote,item:{...item,status}},popup:true,onClose(){},onEdit(){}}),nodes=descendants(tree);
        if(actionStep++===0)nodes.find(node=>node.type==='button'&&node.props.children===actionLabel).props.onClick();
        else {assert.equal(nodes.filter(node=>node.type===AdminDialog).length,0);assert.ok(nodes.some(node=>node.props.role==='group'&&node.props['aria-label']===(status==='published'?'Delete Article':status==='draft'?'Publish Article':'Restore to Draft')));}
        return tree;
      }
      const html=wrap(React.createElement(ConfirmAction),role);assert.ok(!html.includes('<dialog'),'Confirmation stays inside the existing shell');
    }
  }
  // Exercise Back/restore/close without a browser or private data.
  function historyFixture(){
    let listener,dirty=false,busy=false,asked=0,dismissed=0,backs=0,prevented=0;
    const jumps=[];
    const browser={history:{state:{idx:4},go:delta=>jumps.push(delta),back:()=>backs++},addEventListener:(event,handler,capture)=>{assert.equal(event,'popstate');assert.equal(capture,true);listener=handler;},removeEventListener:(event,handler)=>{assert.equal(handler,listener);listener=null;}};
    const controller=protectEducationalPopup(browser,{getProtection:()=>({dirty,busy}),requestClose:()=>asked++,dismiss:()=>dismissed++});
    return {controller,jumps,protect:(d,b=false)=>{dirty=d;busy=b;},pop:idx=>listener({state:{idx},stopImmediatePropagation:()=>prevented++}),state:()=>({asked,dismissed,backs,prevented}),attached:()=>!!listener};
  }
  const clean=historyFixture();clean.pop(3);assert.equal(clean.state().dismissed,1);assert.equal(clean.state().prevented,0);clean.controller.dispose();assert.equal(clean.attached(),false);
  const guarded=historyFixture();guarded.protect(true);guarded.pop(3);assert.deepEqual(guarded.jumps,[1]);assert.equal(guarded.state().dismissed,0);guarded.pop(4);assert.equal(guarded.state().asked,1);guarded.controller.close();guarded.controller.close();assert.equal(guarded.state().backs,1);guarded.pop(3);assert.equal(guarded.state().dismissed,1);guarded.controller.dispose();
  const busyHistory=historyFixture();busyHistory.protect(false,true);busyHistory.pop(3);busyHistory.pop(4);assert.equal(busyHistory.state().asked,0);assert.equal(busyHistory.state().dismissed,0);busyHistory.controller.dispose();
  const completing=historyFixture();completing.protect(true,true);completing.pop(3);completing.controller.close();assert.equal(completing.state().backs,0,'A completed save waits for history restoration');completing.pop(4);assert.equal(completing.state().backs,1);completing.pop(3);assert.equal(completing.state().dismissed,1);completing.controller.dispose();
  model.dispose();detailModel.dispose();
  console.log('Education checks passed: both roles, preserved status/search/category/page controls, card-to-details and details-to-edit modal transitions, one shell with inline lifecycle/discard confirmations, retained dirty form/cover preview, guarded Back/busy/save-completion history, safe deep links/create routes, safe rich text, real transport/lifecycle, duplicate/stale guards and unchanged fields.');
}

// Also run directly; the complete auth runner continues to call the same checks.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');
  const server = await createServer({ server: { middlewareMode: true } });
  try { await checkEducation(server); } finally { await server.close(); }
}
