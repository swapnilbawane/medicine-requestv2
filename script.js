// IDs
const STORAGE_KEY = 'medicineRequestState';

// Load state from localStorage
function loadState() {
  const s = localStorage.getItem(STORAGE_KEY);
  if (!s) return {};
  try { return JSON.parse(s); } catch { return {}; }
}

// Save state
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Recovery on load
let state = loadState();
document.getElementById('patientName').value = state.patient || '';
document.getElementById('placeInfo').value = state.place || '';
document.getElementById('contactInfo').value = state.contact || '';

// CSV and maps
let doctorMedMap = {};
document.getElementById('csvFile').addEventListener('change', handleFile);

function handleFile(e) {
  const f = e.target.files[0];
  if (!f) return;
  Papa.parse(f, {
    header: false, skipEmptyLines: true,
    complete: res => {
      doctorMedMap = {};
      res.data.forEach(r => {
        const [doc, med] = r.map(s=>s.trim());
        if (!doc || !med) return;
        doctorMedMap[doc] = doctorMedMap[doc]||new Set();
        doctorMedMap[doc].add(med);
      });
      renderDoctors();
      state.csv = res.data;
      saveState(state);
    },
  });
}

function renderDoctors() {
  const c = document.getElementById('medicinesContainer');
  c.innerHTML = ''; state.selected = state.selected || {};
  document.getElementById('formSection').style.display = 'block';

  for (let doc in doctorMedMap) {
    const sec = document.createElement('div');
    sec.className = 'doctor-card';
    sec.innerHTML = `<h3>${doc}</h3>`;
    doctorMedMap[doc].forEach(med => {
      const chk = document.createElement('input');
      chk.type='checkbox'; chk.value=med; chk.dataset.doctor=doc;
      chk.checked = state.selected[doc]?.[med]?.checked;
      chk.addEventListener('change', toggleStrip);

      const num = document.createElement('input');
      num.type='number'; num.min=1; num.value = state.selected[doc]?.[med]?.strips||1;
      num.disabled = !chk.checked;
      num.addEventListener('change', updateStrip);

      const lbl = document.createElement('label');
      lbl.append(chk, ' ', med, ' – Strips: ', num);
      sec.append(lbl);
    });
    c.append(sec);
  }
}

function toggleStrip(e){
  const doc=e.target.dataset.doctor, med=e.target.value;
  state.selected[doc] = state.selected[doc]||{};
  state.selected[doc][med] = state.selected[doc][med]||{};
  state.selected[doc][med].checked = e.target.checked;
  if(!e.target.checked){ delete state.selected[doc][med]; }
  saveState(state);
  e.target.nextElementSibling.disabled = !e.target.checked;
}
function updateStrip(e){
  const doc = e.target.previousElementSibling.dataset.doctor;
  const med = e.target.previousElementSibling.value;
  state.selected[doc][med].strips = e.target.value;
  saveState(state);
}

// Generate, print, email
document.getElementById('generateBtn').onclick = generate;
document.getElementById('printBtn').onclick = () => printSection('requestContainer');
document.getElementById('emailBtn').onclick = emailSection;

function generate() {
  const name = document.getElementById('patientName').value.trim();
  const place = document.getElementById('placeInfo').value.trim();
  const contact = document.getElementById('contactInfo').value.trim();
  if (!name) return alert('Enter name');
  state.patient=name; state.place=place; state.contact=contact; saveState(state);

  const sel=state.selected||{};
  if(Object.keys(sel).length==0)return alert('Choose medicine');
  const rc = document.getElementById('requestContainer');
  rc.innerHTML= `
    <p><strong>Person name:</strong> ${name}</p>
    <p><strong>Place:</strong> ${place||'-'}</p>
    <p><strong>Contact:</strong> ${contact||'-'}</p>
    <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>`;
  for(let doc in sel){
    const meds=sel[doc], keys=Object.keys(meds);
    if(keys.length==0) continue;
    rc.innerHTML+=`<h4>Doctor: ${doc}</h4>`;
    const t = document.createElement('table');
    t.innerHTML = '<tr><th>Medicine</th><th>Strips</th></tr>';
    keys.forEach(med => {
      const tr=document.createElement('tr');
      tr.innerHTML = `<td>${med}</td><td>${meds[med].strips}</td>`;
      t.append(tr);
    });
    rc.append(t);
  }
  document.getElementById('outputSection').style.display = 'block';
}

function printSection(id){
  const win=window.open();
  win.document.write(document.getElementById(id).innerHTML);
  win.print(); win.close();
}

function emailSection(){
  const rc = document.getElementById('requestContainer').innerText;
  const subject='Medicine Request';
  location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(rc)}`;
}

// Download PNG
document.getElementById('downloadBtn').onclick = () => {
  html2canvas(document.getElementById('requestContainer')).then(canvas => {
    const link=document.createElement('a');
    link.download='medicine_request.png';
    link.href=canvas.toDataURL();
    link.click();
  });
};

// On load: if CSV in state, rebuild
window.onload = () => {
  if(state.csv) {
    doctorMedMap = {};
    state.csv.forEach(r => {
      const [doc,med] = r;
      doctorMedMap[doc] = doctorMedMap[doc]|| new Set();
      doctorMedMap[doc].add(med);
    });
    renderDoctors();
  }
};
