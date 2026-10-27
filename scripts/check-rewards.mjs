import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

export async function checkRewards(server) {
  const { createRewards, validateReward } = await server.ssrLoadModule('/src/services/rewardsApi.js');
  const { RewardsView } = await server.ssrLoadModule('/src/pages/Rewards.jsx');
  const { default: RewardsAnalytics } = await server.ssrLoadModule('/src/components/rewards/RewardsAnalytics.jsx');
  const { default: MonthFilter } = await server.ssrLoadModule('/src/components/ui/MonthFilter.jsx');
  const { RewardForm } = await server.ssrLoadModule('/src/pages/AddReward.jsx');
  const { default: RewardPopup, RewardPopupView, RewardDetails } = await server.ssrLoadModule('/src/components/rewards/RewardPopup.jsx');
  const { default: RewardCover } = await server.ssrLoadModule('/src/components/rewards/RewardCover.jsx');
  const { default: AdminDialog } = await server.ssrLoadModule('/src/components/ui/AdminDialog.jsx');
  const { AdminSessionContext } = await server.ssrLoadModule('/src/auth/useAdminSession.js');
  const render = (Component, remote, extra = {}, role = 'admin') => renderToString(React.createElement(MemoryRouter, null,
    React.createElement(AdminSessionContext.Provider, { value: { role, isSuperAdmin: role === 'super_admin', currentAdmin: { name: 'Reward admin' } } },
      React.createElement(Component, { remote, ...extra })))).replace(/<!-- -->/g, '');
  let reward = { id: 81, name: '<b>API grocery</b>', category: 'grocery', amount_mode: 'custom', voucher_value: '125.50', points_cost: 75, stock_quantity: 9, status: 'active', recoverable: false };
  let redemptions = [{ id: 71, donor: 'Real buyer', reward: 'Original grocery', category: 'grocery', voucherValue: 125.5, pointsUsed: 75, redeemedDate: '2026-09-27', status: 'available' }];
  const analytics = { summary: { total_redemptions: 1, total_points_spent: 75, active_inventory: 9 },
    monthly_redemptions: Array.from({ length: 12 }, (_, index) => ({ period: `2026-${String(index + 1).padStart(2, '0')}`, redemptions: index === 8 ? 1 : 0 })), top_rewards: [{ reward_id: 81, reward_name: 'Original grocery', redemptions: 1 }] };
  const calls = [];
  let fail = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, 'Bearer reward-token');
    const endpoint = new URL(url);
    calls.push({ endpoint, options });
    if (fail) return Response.json({ message: 'Unavailable' }, { status: 503 });
    if (endpoint.pathname.endsWith('/analytics')) return Response.json({ ...analytics, year: Number(endpoint.searchParams.get('year')), month: null,
      monthly_redemptions: analytics.monthly_redemptions.map((row) => ({ ...row, period: `${endpoint.searchParams.get('year')}${row.period.slice(4)}` })) });
    if (endpoint.pathname.endsWith('/redemptions')) return Response.json({ data: redemptions });
    if (options.method === 'DELETE') { reward = { ...reward, status: 'deleted', recoverable: true }; return Response.json({ reward }); }
    if (endpoint.pathname.endsWith('/restore')) { reward = { ...reward, status: 'inactive', recoverable: false }; return Response.json({ reward }); }
    if (options.method === 'POST') {
      assert.ok(options.body instanceof FormData);
      assert.equal(options.headers['Content-Type'], undefined);
      assert.equal(options.body.has('amount_mode'), false, 'Management submits manual values without Amount Mode');
      reward = { ...reward, name: options.body.get('name'), category: options.body.get('category'), voucher_value: options.body.get('voucher_value') };
      return Response.json({ reward });
    }
    return Response.json(endpoint.pathname.endsWith('/rewards') ? { data: [reward] } : { reward });
  };
  try {
    const run = (operation) => operation('reward-token');
    const list = createRewards(run);
    const remote = () => ({ ...list.getSnapshot(), model: list });
    assert.ok(render(RewardsView, remote()).includes('Loading page'));
    await list.load();
    assert.equal(remote().items[0].voucherValue, 125.5);
    const descendants = (element) => React.isValidElement(element)
      ? [element, ...React.Children.toArray(element.props.children).flatMap(descendants)] : [];
    const categories = ['merchandise', 'apparel', 'vouchers', 'grocery', 'medicine', 'fitness', 'other'];
    const categoryLabels = ['All Categories', 'Merchandise', 'Apparel', 'Vouchers'];
    const states = ['analytics', 'active', 'inactive', 'deleted'];
    for (const role of ['admin', 'super_admin']) {
      let step = 0;
      const observed = [];
      function ExerciseCards() {
        const view = RewardsView({ remote: remote() });
        const nodes = descendants(view);
        const cards = nodes.filter(node => node.type === 'button' && node.props['aria-label']?.startsWith('Show '));
        assert.equal(cards.length, 4);
        assert.deepEqual(cards.map(node => node.props['aria-label']), ['Show Analytics rewards', 'Show Active rewards', 'Show Inactive rewards', 'Show Deleted rewards']);
        assert.ok(cards.every(node => node.props.type === 'button' && node.props.className.includes('focus-visible:')));
        assert.equal(nodes.filter(node => node.type === 'button' && ['Active', 'Inactive', 'Deleted', 'Analytics'].includes(node.props.children)).length, 0, 'No duplicate status tabs or Analytics main tab');
        const navigation = nodes.find(node => node.props['aria-label'] === 'Rewards sections');
        assert.equal(descendants(navigation).filter(node => node.type === 'button').length, 3);
        const panel = nodes.find(node => node.props.id === 'rewards-analytics');
        observed.push({ selected: cards.findIndex(node => node.props['aria-pressed']), hidden: panel.props.hidden });
        if (step < states.length) cards[step++].props.onClick();
        return view;
      }
      const html = render(ExerciseCards, remote(), {}, role);
      assert.deepEqual(observed, [{ selected: 1, hidden: true }, { selected: 0, hidden: false }, { selected: 1, hidden: true }, { selected: 2, hidden: true }, { selected: 3, hidden: true }]);
      assert.ok(html.includes('Available Stock'));
      const page = render(RewardsView, remote(), {}, role);
      for (const label of ['Add Reward', 'Reward Management', 'Manage LifeFlow rewards', 'LIFEFLOW REWARDS', 'Search rewards...', 'All Categories', '&lt;b&gt;API grocery&lt;/b&gt;']) assert.ok(page.includes(label), label);
      const filter = page.match(/<select aria-label="Category"[\s\S]*?<\/select>/)[0];
      assert.deepEqual([...filter.matchAll(/<option[^>]*>([^<]+)<\/option>/g)].map(match => match[1]), categoryLabels);
    }
    for (const role of ['admin', 'super_admin']) {
      const items = categories.map((category, index) => ({ ...remote().items[0], id: index + 1, name: category + ' reward', category }));
      const originalItems = JSON.stringify(items);
      const observed = [];
      let step = 0;
      const selections = ['merchandise', 'apparel', 'vouchers', 'all'];
      function ExerciseManagementFilters() {
        const view = RewardsView({ remote: { ...remote(), items } });
        const nodes = descendants(view);
        const filter = nodes.find(node => node.props['aria-label'] === 'Category');
        assert.deepEqual(descendants(filter).filter(node => node.type === 'option').map(node => node.props.value),
          ['all', 'merchandise', 'apparel', 'vouchers']);
        observed.push(nodes.filter(node => node.props['aria-label']?.startsWith('View reward:')).map(node => node.key));
        if (step < selections.length) filter.props.onChange({ target: { value: selections[step++] } });
        return view;
      }
      render(ExerciseManagementFilters, remote(), {}, role);
      assert.deepEqual(observed.map(rows => rows.length), [7, 1, 1, 1, 7]);
      assert.deepEqual(observed.slice(1, 4).map(rows => rows[0]), ['.$1', '.$2', '.$3']);
      assert.equal(JSON.stringify(items), originalItems, 'UI filtering preserves legacy records');
    }
    let html = render(RewardsView, remote(), { initialTab: 'redemptions' });
    for (const label of ['Real buyer', 'Original grocery', 'Available', 'All Months']) assert.ok(html.includes(label));
    assert.ok(!html.includes('Voucher Amount') && !html.includes('All amounts'));
    const redemptionItems = categories.flatMap((category, group) => ['available', 'active', 'redeemed', 'expired'].flatMap((status, index) => [0, 1].map((row) => ({
      ...redemptions[0], id: group * 10 + index * 2 + row + 1, category, status,
      reward: `${row === 0 ? 'Matching' : 'Other'} ${category} ${status}`, redeemedDate: row === 0 ? '2026-09-27' : '2026-08-27',
    }))));
    const originalRedemptions = JSON.stringify(redemptionItems);
    for (const role of ['admin', 'super_admin']) {
      for (const status of ['available', 'redeemed', 'expired']) {
        const beforeCalls = calls.length;
        const observed = [];
        let step = 0;
        const actions = [
          (nodes) => nodes.find((node) => node.props['aria-label'] === 'Search redemptions').props.onChange({ target: { value: 'Matching' } }),
          (nodes) => nodes.find((node) => node.props['aria-label'] === 'Redemption status').props.onChange({ target: { value: status } }),
          (nodes) => nodes.find((node) => node.type === MonthFilter).props.onChange('08'),
          (nodes) => nodes.find((node) => node.type === MonthFilter).props.onChange('09'),
          (nodes) => nodes.find((node) => node.type === 'button' && node.props.children === 'Clear').props.onClick(),
        ];
        function ExerciseRedemptions() {
          const view = RewardsView({ remote: { ...remote(), redemptions: redemptionItems }, initialTab: 'redemptions' });
          const nodes = descendants(view);
          assert.equal(nodes.some(node => node.props['aria-label'] === 'Redemption category'), false);
          const bar = nodes.find(node => node.type === 'div' && React.Children.toArray(node.props.children).some(child => child.type === MonthFilter));
          assert.deepEqual(React.Children.toArray(bar.props.children).map(child => child.type === MonthFilter ? 'month'
            : child.type === 'button' ? 'clear' : descendants(child).find(node => ['input', 'select'].includes(node.type))?.props['aria-label']),
          ['Search redemptions', 'Redemption status', 'month', 'clear'], 'Exact redemption filter order');
          const statusFilter = nodes.find((node) => node.props['aria-label'] === 'Redemption status');
          assert.deepEqual(descendants(statusFilter).filter((node) => node.type === 'option').map((node) => [node.props.value, node.props.children]),
            [['', 'All statuses'], ['available', 'Available'], ['redeemed', 'Redeemed'], ['expired', 'Expired']]);
          const month = nodes.find((node) => node.type === MonthFilter);
          const rows = nodes.filter((node) => node.type === 'tr' && descendants(node).some((child) => child.type === 'td'));
          observed.push({ ids: rows.map((node) => Number(node.key.match(/(\d+)$/)[1])),
            status: statusFilter.props.value, search: nodes.find((node) => node.props['aria-label'] === 'Search redemptions').props.value, month: month.props.value });
          if (step < actions.length) actions[step++](nodes);
          return view;
        }
        render(ExerciseRedemptions, remote(), {}, role);
        assert.deepEqual(observed.map(row => row.ids.length), [56, 28, 7, 0, 7, 56]);
        const ids = categories.map((_, group) => group * 10 + ['available', 'active', 'redeemed', 'expired'].indexOf(status) * 2 + 1);
        assert.deepEqual(observed[2].ids, ids, 'Every new and legacy category remains available');
        assert.deepEqual(observed[4], { ids, status, search: 'Matching', month: '09' });
        assert.deepEqual(observed[5], { ids: redemptionItems.map(row => row.id), status: '', search: '', month: '' });
        assert.equal(calls.length, beforeCalls, 'Filter changes do not refetch or mutate');
      }
      const allStatusesHtml = render(RewardsView, { ...remote(), redemptions: redemptionItems }, { initialTab: 'redemptions' }, role);
      assert.ok(allStatusesHtml.includes('Matching grocery active'), 'Active lifecycle records remain visible in All statuses');
      assert.ok(!allStatusesHtml.includes('Redemption category') && !allStatusesHtml.includes('<option value="grocery"'));
    }
    assert.equal(JSON.stringify(redemptionItems), originalRedemptions);
    html = render(RewardsAnalytics, remote(), {});
    for (const label of ['Redeemed', 'Points Spent', 'Active Stock', 'Redemption Trend', 'Top 3 Most Redeemed Rewards', '1 redemptions']) assert.ok(html.includes(label));
    assert.ok(!html.includes('Voucher Amount Breakdown'));
    const initialYear = remote().year;
    for (const role of ['admin', 'super_admin']) {
      const view = RewardsAnalytics({ remote: remote() });
      const nodes = descendants(view);
      assert.equal(nodes.filter((node) => node.type === 'select' || node.type === MonthFilter).length, 0);
      const group = nodes.find((node) => node.props['aria-label'] === 'Analytics year');
      const header = nodes.find((node) => React.Children.toArray(node.props.children).some((child) => child.props?.['aria-label'] === 'Analytics year'));
      assert.ok(header.props.className.includes('justify-between') && group.props.className.includes('ml-auto'));
      assert.ok(descendants(header).some((node) => node.type === 'h4' && node.props.children === 'Redemption Trend'));
      const buttons = descendants(group).filter((node) => node.type === 'button');
      assert.deepEqual(buttons.map((node) => node.props['aria-label']), ['Previous year', 'Next year']);
      assert.ok(buttons.every((node) => node.props.type === 'button' && node.props.className.includes('focus-visible:')));
      const cards = nodes.find((node) => node.type === 'dl');
      assert.equal(React.Children.toArray(cards.props.children).length, 3);
      assert.ok(React.Children.toArray(cards.props.children).every((node) => node.type === 'div' && node.props.className.includes('border border-gray-200') && !node.props.onClick));
      const beforeCalls = calls.length;
      const previousAnalytics = remote().analytics;
      const previousItems = remote().items;
      const previousRedemptions = remote().redemptions;
      const down = buttons[0].props.onClick();
      assert.equal(remote().year, String(Number(initialYear) - 1));
      assert.equal(remote().analyticsLoading, true);
      assert.equal(remote().loading, false);
      assert.equal(remote().analytics, previousAnalytics);
      const loadingHtml = render(RewardsAnalytics, remote(), {}, role);
      assert.ok(!loadingHtml.includes('Loading page') && loadingHtml.includes('Refreshing analytics') && loadingHtml.includes('Redemption Trend'));
      await down;
      assert.equal(remote().analytics.year, Number(initialYear) - 1);
      assert.equal(remote().analyticsLoading, false);
      const upNodes = descendants(RewardsAnalytics({ remote: remote() }));
      await upNodes.find((node) => node.props['aria-label'] === 'Next year').props.onClick();
      assert.equal(remote().year, initialYear);
      assert.equal(remote().items, previousItems);
      assert.equal(remote().redemptions, previousRedemptions);
      assert.equal(calls.length, beforeCalls + 2, 'Year changes fetch only Analytics');
      assert.ok(calls.slice(beforeCalls).every((call) => call.endpoint.pathname.endsWith('/analytics') && !call.endpoint.searchParams.has('month')));
      const analyticsHtml = render(RewardsAnalytics, remote(), {}, role);
      assert.ok(analyticsHtml.includes('lucide-chevron-down') && analyticsHtml.includes('lucide-chevron-up') && !analyticsHtml.includes('<select'));
      assert.ok(analyticsHtml.includes('January: 0 redemptions') && analyticsHtml.includes('December: 0 redemptions'));
    }
    assert.equal(remote().month, undefined, 'No hidden analytics month state');
    for (const [year, label] of [['2000', 'Previous year'], [String(Number(initialYear) + 1), 'Next year']]) {
      const nodes = descendants(RewardsAnalytics({ remote: { ...remote(), year } }));
      assert.equal(nodes.find((node) => node.props['aria-label'] === label).props.disabled, true);
    }
    fail = true;
    const cachedAnalytics = remote().analytics;
    await list.loadAnalytics(String(Number(initialYear) - 1));
    assert.equal(remote().error, '');
    assert.equal(remote().analytics, cachedAnalytics);
    assert.equal(remote().loading, false);
    assert.ok(render(RewardsAnalytics, remote(), {}).includes('Unable to load Rewards Analytics'));
    fail = false;
    const retry = descendants(RewardsAnalytics({ remote: remote() })).find((node) => node.props.title === 'Unable to load Rewards Analytics');
    await retry.props.onRetry();
    assert.equal(remote().analyticsError, '');
    assert.equal(remote().analytics.year, Number(initialYear) - 1);
    const emptyAnalytics = { ...remote(), analytics: { summary: { total_redemptions: 0, total_points_spent: 0, active_inventory: 9 }, monthly_redemptions: [], top_rewards: [] } };
    assert.ok(render(RewardsAnalytics, emptyAnalytics).includes('No redemptions for this year'));
    assert.ok(render(RewardsAnalytics, emptyAnalytics).includes('No rewards redeemed for this year'));
    await list.transition(81, 'delete');
    assert.equal(remote().items[0].status, 'deleted');
    await list.transition(81, 'restore');
    assert.equal(remote().items[0].status, 'inactive');

    const form = createRewards(run, 'new');
    html = render(RewardForm, { ...form.getSnapshot(), model: form });
    for (const label of ['Reward Name', 'Category', 'Points Required', 'Available Stock', 'Save Reward']) assert.ok(html.includes(label), label);
    assert.ok(!html.includes('id="voucherValue"') && !html.includes('Amount Mode'));
    const data = { name: 'New reward', category: 'vouchers', voucher_value: '125.50', points_cost: 75, stock_quantity: 9, status: 'active' };
    assert.equal(await form.save({ ...data, stock_quantity: -1 }), false);
    for (const voucher_value of ['0', '-1', '1.001', '', 'abc', '100000.01']) assert.ok(validateReward({ ...data, voucher_value }));
    assert.equal(validateReward({ ...data, category: 'merchandise', voucher_value: '' }), '');
    assert.ok(validateReward({ ...data, category: 'apparel', variants: [] }));
    const apparel = { ...data, category: 'apparel', voucher_value: '', stock_quantity: 23,
      variants: [{ size: 'S', stock_quantity: 5 }, { size: 'M', stock_quantity: 10 }, { size: 'L', stock_quantity: 8 }, { size: 'XL', stock_quantity: 0 }] };
    assert.equal(validateReward(apparel), '');
    assert.ok(validateReward({ ...apparel, variants: [{ size: 'XXL', stock_quantity: 2 }] }));
    assert.ok(validateReward({ ...apparel, variants: [{ size: 'S', stock_quantity: 1.5 }] }));
    assert.equal(await form.save(apparel), true);
    assert.equal(calls.at(-1).options.body.get('variants[0][size]'), 'S');
    assert.equal(calls.at(-1).options.body.get('variants[3][stock_quantity]'), '0');
    for (const category of ['merchandise', 'apparel', 'vouchers', 'grocery']) {
      const item = { ...remote().items[0], category, variants: apparel.variants.map((row, id) => ({ ...row, id, enabled: true })), voucherValue: 125.5 };
      const html = render(RewardForm, { item, busy: false, error: '', model: form });
      assert.equal(html.includes('id="voucherValue"'), category === 'vouchers');
      assert.equal(html.includes('id="stock"'), category !== 'apparel');
      assert.equal(html.includes('Size &amp; Inventory'), category === 'apparel');
      if (category === 'apparel') assert.ok(html.includes('Total Available Stock: 23'));
      if (category === 'grocery') assert.ok(html.includes('value="grocery" selected=""'));
    }
    const edit = createRewards(run, 81);
    await edit.load();
    assert.equal(await edit.save({ ...data, name: 'Edited reward', expected_stock: 9 }), true);
    assert.equal(calls.at(-1).options.body.get('_method'), 'PUT');
    assert.equal(calls.at(-1).options.body.get('expected_stock'), '9');
    const savedImage = { ...remote().items[0], id:81, name:'Saved shirt', category:'apparel', status:'active', stock:9, inventory_version:'inventory-original',
      image_url:'https://media.test/saved.png', description:'Saved description', variants:[{size:'M',enabled:true,stock_quantity:9}] };
    for(const role of ['admin','super_admin']) for(const status of ['active','inactive','deleted']){
      let stage=0,entries=0,focuses=0;
      const record={...savedImage,status,recoverable:true};
      function OpenReward(){
        const tree=RewardsView({remote:{...remote(),items:[record]},enterPopupHistory:id=>{entries++;assert.equal(id,81);}}),nodes=descendants(tree);
        if(stage===0){stage++;nodes.find(node=>node.props['aria-label']===`Show ${status[0].toUpperCase()+status.slice(1)} rewards`).props.onClick();}
        else if(stage===1){
          stage++;const card=nodes.find(node=>node.props['aria-label']==='View reward: Saved shirt');assert.equal(card.props.type,'button');assert.equal(card.props['aria-haspopup'],'dialog');
          assert.equal(descendants(card).filter(node=>node.type==='button').length,1);assert.ok(card.props.className.includes('hover:bg-primary-soft')&&card.props.className.includes('focus-visible:'));
          assert.equal(descendants(card).filter(node=>node.props.size===18&&node.props['aria-hidden']==='true').length,1);
          card.props.onClick({currentTarget:{focus:()=>focuses++}});card.props.onClick({currentTarget:{focus:()=>assert.fail('Duplicate open')}});
        }else{const popup=nodes.find(node=>node.type===RewardPopup);assert.equal(popup.props.id,81);assert.equal(nodes.find(node=>node.props['aria-pressed']&&node.props['aria-label']?.startsWith('Show ')).props['aria-label'],`Show ${status[0].toUpperCase()+status.slice(1)} rewards`);}
        return tree;
      }
      render(OpenReward,remote(),{},role);assert.equal(entries,1);assert.equal(focuses,1);
      const detail=render(RewardPopupView,{item:record,loading:false,busy:false,error:'',model:edit},{onDismiss(){},onChanged(){}},role);
      assert.ok(detail.includes('Reward Details')&&detail.includes('Saved description')&&detail.includes('Size M')&&detail.includes('9 available'));
      assert.equal(detail.includes('>Edit Reward</button>'),status!=='deleted');assert.equal(detail.includes('>Delete</button>'),status!=='deleted');assert.equal(detail.includes('>Restore to Inactive</button>'),status==='deleted');
      let mode=0;
      if(status!=='deleted'){
        function EditMode(){const tree=RewardPopupView({remote:{item:record,loading:false,busy:false,error:'',model:edit},onDismiss(){},onChanged(){}}),nodes=descendants(tree);if(mode++===0)nodes.find(node=>node.type==='button'&&node.props.children==='Edit Reward').props.onClick();else assert.ok(nodes.find(node=>node.type===RewardForm).props.popup);return tree;}
        const html=render(EditMode,remote(),{},role);assert.equal((html.match(/<dialog\b/g)||[]).length,1);assert.ok(html.includes('Save Reward'));
      }
    }
    const expired=render(RewardPopupView,{item:{...savedImage,status:'deleted',recoverable:false},loading:false,busy:false,error:'',model:edit},{onDismiss(){},onChanged(){}});
    assert.match(expired,/<button[^>]*disabled=""[^>]*>Restore to Inactive<\/button>/);
    assert.ok(!render(RewardPopupView,{item:null,loading:false,busy:false,error:'Not found',model:edit},{onDismiss(){},onChanged(){}}).includes('>Edit Reward</button>'));
    const details=renderToString(React.createElement(RewardDetails,{item:{...savedImage,category:'vouchers',voucherValue:200}}));assert.ok(details.includes('Voucher Value')&&!details.includes('Size M'));
    let dirtyStage=0,closed=0;
    function DirtyEdit(){
      const tree=RewardForm({remote:{item:savedImage,busy:false,error:'Save failed',model:edit},popup:true,onClose:()=>closed++}),nodes=descendants(tree);
      if(dirtyStage===0){dirtyStage++;nodes.find(node=>node.props.name==='name').props.onChange({target:{name:'name',value:'Unsaved shirt'}});}
      else if(dirtyStage===1){dirtyStage++;nodes.find(node=>node.type==='button'&&node.props.children==='Cancel').props.onClick();}
      else if(dirtyStage===2){dirtyStage++;assert.equal(nodes.find(node=>node.type==='form').props.hidden,true);assert.equal(nodes.filter(node=>node.type===AdminDialog).length,0);nodes.find(node=>node.type==='button'&&node.props.children==='Keep Editing').props.onClick();}
      else if(dirtyStage===3){dirtyStage++;assert.equal(nodes.find(node=>node.props.name==='name').props.value,'Unsaved shirt');nodes.find(node=>node.type==='button'&&node.props.children==='Cancel').props.onClick();}
      else nodes.find(node=>node.type==='button'&&node.props.children==='Discard Changes').props.onClick();
      return tree;
    }
    render(DirtyEdit,remote());assert.equal(closed,1);
    let capture,saveStep=0,savedCalls=0,finishSave,savedNotice=0,submitted;
    const saveModel={save:data=>{savedCalls++;submitted=data;return new Promise(resolve=>finishSave=resolve);}};
    const createURL=URL.createObjectURL;URL.createObjectURL=()=> 'blob:reward-preview';
    function SaveEdit(){
      const tree=RewardForm({remote:{item:saveStep?{...savedImage,stock:15,inventory_version:'new-server-version'}:savedImage,busy:false,error:'',model:saveModel},popup:true,onSaved:()=>savedNotice++}),nodes=descendants(tree);
      if(saveStep===0){saveStep++;nodes.find(node=>node.props.type==='file').props.onChange({target:{files:[new File(['image'],'new.png',{type:'image/png'})]}});}
      else {assert.equal(nodes.find(node=>node.type===RewardCover).props.src,'blob:reward-preview');capture=nodes.find(node=>node.type==='form');}
      return tree;
    }
    try{render(SaveEdit,remote());}finally{URL.createObjectURL=createURL;}
    const firstSave=capture.props.onSubmit({preventDefault(){}});await capture.props.onSubmit({preventDefault(){}});assert.equal(savedCalls,1);
    assert.equal(submitted.expected_stock,9);assert.equal(submitted.expected_inventory_version,'inventory-original');assert.equal(submitted.image.name,'new.png');assert.equal(submitted.variants[0].size,'M');
    finishSave(false);await firstSave;assert.equal(savedNotice,0);const retrySave=capture.props.onSubmit({preventDefault(){}});finishSave(true);await retrySave;assert.equal(savedNotice,1);
    for(const action of ['delete','restore']){
      let phase=0,confirmation,transitions=0,completed=0,release;
      const record={...savedImage,status:action==='delete'?'active':'deleted',recoverable:true};
      function ConfirmReward(){
        const tree=RewardPopupView({remote:{item:record,loading:false,busy:false,error:'',model:{transition:(id,received)=>{assert.equal(id,81);assert.equal(received,action);transitions++;return new Promise(resolve=>release=resolve);}}},onDismiss(){},onChanged:()=>completed++}),nodes=descendants(tree);
        if(phase++===0)nodes.find(node=>node.type==='button'&&node.props.children===(action==='delete'?'Delete':'Restore to Inactive')).props.onClick();
        else{assert.equal(nodes.filter(node=>node.type===AdminDialog).length,1);confirmation=nodes.find(node=>node.type==='button'&&node.props.children==='Confirm');}
        return tree;
      }
      render(ConfirmReward,remote());assert.equal(transitions,0);confirmation.props.onClick();confirmation.props.onClick();assert.equal(transitions,1);release(false);await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,0);
      confirmation.props.onClick();release(true);await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,1);
    }
    const cachedItems=list.getSnapshot().items;const background=list.load(undefined,{background:true});assert.equal(list.getSnapshot().loading,false);assert.equal(list.getSnapshot().items,cachedItems);await background;
    const lastSuccessfulItems = list.getSnapshot().items;
    fail = true;
    await list.load();
    assert.ok(render(RewardsView, remote()).includes('Try again'));
    assert.equal(list.getSnapshot().items, lastSuccessfulItems, 'Failed refresh preserves the successfully loaded catalogue');
    const retainedHistory = render(RewardsView, remote(), { initialTab: 'redemptions' });
    assert.ok(retainedHistory.includes('Real buyer') && !retainedHistory.includes('Loading page') && !retainedHistory.includes('No redemptions yet'), 'Failed refresh keeps real redemption history visible');
    fail = false;
    await list.load();
    assert.equal(remote().error, '');
    redemptions = [];
    await list.load();
    assert.ok(render(RewardsView, remote(), { initialTab: 'redemptions' }).includes('No redemptions yet'));
    assert.ok(render(RewardsView, { ...remote(), items: [] }).includes('No rewards available yet'));

    let complete;
    let submissions = 0;
    const slow = createRewards(run, 'new', { save: () => { submissions++; return new Promise((resolve) => { complete = resolve; }); } });
    const first = slow.save(data);
    assert.equal(await slow.save(data), false);
    assert.equal(submissions, 1);
    complete(reward);
    assert.equal(await first, true);
    const pending = [];
    const race = createRewards(run, 81, { detail: () => new Promise((resolve) => pending.push(resolve)) });
    const older = race.load(); await race.load();
    assert.equal(pending.length, 1, 'Repeated detail Retry taps share the pending read');
    race.dispose(); const newer = race.load();
    pending[1]({ name: 'Latest' }); await newer;
    pending[0]({ name: 'Stale' }); await older;
    assert.equal(race.getSnapshot().item.name, 'Latest');
    const analyticsPending = [];
    const analyticsRace = createRewards(run, undefined, { analytics: (_token, year) => new Promise((resolve) => analyticsPending.push({ year, resolve })) });
    const olderAnalytics = analyticsRace.loadAnalytics('2024');
    const newerAnalytics = analyticsRace.loadAnalytics('2025');
    analyticsPending[1].resolve({ ...analytics, year: 2025 }); await newerAnalytics;
    analyticsPending[0].resolve({ ...analytics, year: 2024 }); await olderAnalytics;
    assert.equal(analyticsRace.getSnapshot().year, '2025');
    assert.equal(analyticsRace.getSnapshot().analytics.year, 2025, 'Older year responses cannot overwrite the latest selection');
    const disposedAnalytics = analyticsRace.loadAnalytics('2026');
    analyticsRace.dispose();
    const disposedSnapshot = analyticsRace.getSnapshot();
    analyticsPending[2].resolve({ ...analytics, year: 2026 }); await disposedAnalytics;
    assert.equal(analyticsRace.getSnapshot(), disposedSnapshot, 'Unmounted Analytics ignores outstanding requests');
    assert.ok(calls.filter((call) => call.endpoint.pathname.endsWith('/analytics')).every((call) => !call.endpoint.searchParams.has('month')), 'Initial load, year changes, retries and mutations all request a whole year');
    race.dispose(); list.dispose(); edit.dispose(); form.dispose(); slow.dispose();

    const source = readFileSync('src/components/rewards/RewardsAnalytics.jsx', 'utf8');
    const dashboard = readFileSync('src/pages/Dashboard.jsx', 'utf8').match(/<BarChart data=\{donationActivity\}>[\s\S]*?<\/BarChart>/)[0];
    const chart = source.match(/<BarChart data=\{chartData\}>[\s\S]*?<\/BarChart>/)[0]
      .replace('data={chartData}', 'data={donationActivity}').replace('dataKey="label"', 'dataKey="month"')
      .replace(/\s*tickFormatter=\{\(label\) => label.slice\(0, 3\)\}/, '').replace('dataKey="redemptions"', 'dataKey="donations"').replace(/\s*name="Redeemed"/, '');
    assert.equal(chart.replace(/\s+/g, ' '), dashboard.replace(/\s+/g, ' '));
    console.log('Rewards checks passed: preserved sections/cards/filters/analytics/history, both roles and all management statuses, single-target gallery/details/edit modals, missing/deleted/expired recovery, inline delete/restore confirmations and duplicate guards, retained dirty form/local cover, original stock/version payloads, retry/save/variants, quiet refresh, existing transport/lifecycle and stale guards.');
  } finally { globalThis.fetch = originalFetch; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { createServer } = await import('vite');const server = await createServer({ server: { middlewareMode: true, hmr: false } });
  try { await checkRewards(server); } finally { await server.close(); }
}
