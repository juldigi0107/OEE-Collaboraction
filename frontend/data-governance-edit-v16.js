/* BMJ OEE Data Governance v16 editor bridge */
(()=>{
 const templates=[
  {quality_rule:'',fg_unit:'',ideal_speed_basis:'',mtbf_definition:'',mttr_definition:'',utilization_definition:'',notes:'',approved:false},
  {items:[{canonical:'',aliases:[]}],notes:'',approved:false},
  {group_model:'',workday_cutoff:'',s1_start:'',s1_end:'',s2_start:'',s2_end:'',s3_start:'',s3_end:'',notes:'',approved:false},
  {domains:{production:{source_id:''},quality:{source_id:''},maintenance:{source_id:''},ppic:{source_id:''},development:{source_id:''},master:{source_id:''}},notes:'',approved:false},
  {fields:['plant','machine','PRO','material','work_date','shift','unit'],transaction_keys:['confirmation','counter','batch'],dedupe_rule:'Jangan dedupe berdasarkan PRO saja.',notes:'',approved:false}
 ];
 function open(i){if(user?.role!=='superadmin')return;const key=Object.values(DG16.keys)[i],current=DG16.read(key),value=Object.keys(current).length?current:templates[i];navigate('settings');setTimeout(()=>{const f=$('#de5Config');if(!f){toast('Buka tab Sistem pada Konfigurasi.');return}f.elements.department.value='PROJECT';f.elements.key.value=key;f.elements.value.value=JSON.stringify(value,null,2);f.elements.key.scrollIntoView({behavior:'smooth',block:'center'});toast('Template baseline siap. Review nilai lalu Simpan konfigurasi.');},80)}
 window.DG16Edit={open};
})();
