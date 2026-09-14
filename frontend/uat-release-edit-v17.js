/* BMJ OEE UAT & Go-Live Center v17 editor bridge */
(()=>{
 const templates=[
  {status:'not_started',owner:'',summary:'Uji login, visibility, CRUD dan permission untuk Superadmin, Admin PROD/QC/MTC/PPIC/PDS/PROJECT, serta Viewer.',evidence:'',blocker:'',cases:{superadmin:'not_started',admin_PROD:'not_started',admin_QC:'not_started',admin_MTC:'not_started',admin_PPIC:'not_started',admin_PDS:'not_started',admin_PROJECT:'not_started',viewer:'not_started'}},
  {status:'not_started',owner:'',summary:'Uji desktop, mobile, kiosk/display dan responsive layout.',evidence:'',blocker:'',cases:{chrome_desktop:'not_started',edge_desktop:'not_started',ios_safari:'not_started',android_chrome:'not_started',kiosk_tv:'not_started'}},
  {status:'not_started',owner:'',summary:'Rekonsiliasi reject ID berulang, PPIC signed negative, versi MTC, formula error dan periode aktif.',evidence:'',blocker:'',cases:{reject_duplicates:'not_started',ppic_reversal:'not_started',maintenance_versions:'not_started',formula_errors:'not_started',active_period:'not_started'}},
  {status:'not_started',owner:'',summary:'Validasi published layout, exact machine assignment, resolusi, refresh dan offline state.',evidence:'',blocker:'',cases:{published_layout:'not_started',machine_scope:'not_started',resolution:'not_started',refresh:'not_started',offline_state:'not_started'}},
  {status:'not_started',owner:'',summary:'Uji export/backup D1, restore rehearsal, rollback source dan audit retention.',evidence:'',blocker:'',cases:{backup:'not_started',restore:'not_started',rollback:'not_started',audit_retention:'not_started'}},
  {status:'not_started',owner:'',summary:'Verifikasi Machine Edge/PLC, ODIN, SAP, Qlik, barcode scanner dan dependency jaringan.',evidence:'',blocker:'',cases:{machine_edge:'not_started',odin:'not_started',sap:'not_started',qlik:'not_started',barcode:'not_started'}},
  {status:'not_started',owner:'',summary:'Persetujuan final lintas fungsi dan tanggal go-live.',evidence:'',blocker:'',approvals:{software_owner:'not_started',production:'not_started',quality:'not_started',maintenance:'not_started',ppic:'not_started',management:'not_started'},go_live_date:''}
 ];
 function open(i){if(user?.role!=='superadmin')return;const key=Object.values(UAT17.keys)[i],current=UAT17.read(key),value=Object.keys(current).length?current:templates[i];navigate('settings');setTimeout(()=>{const f=$('#de5Config');if(!f){toast('Buka tab Sistem pada Konfigurasi.');return}f.elements.department.value='PROJECT';f.elements.key.value=key;f.elements.value.value=JSON.stringify(value,null,2);f.elements.key.scrollIntoView({behavior:'smooth',block:'center'});toast('Template UAT siap. Isi hasil/evidence tanpa mengubah status yang belum benar-benar diuji.');},80)}
 window.UAT17Edit={open};
})();
