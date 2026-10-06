// =============================
// CONFIG - แก้ 2 ค่านี้เท่านั้น
// =============================
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyNQvvylJ6NhycHjeFEoH0PogHJAb2uL_jWysslhLMkt0GsM6GWmUwgjwfk4dejjArBwA/exec",
  API_TOKEN: "RiD_FINITY_2026_V1"
};

// ---------- state ----------
let currentSearchRecord = null;
let currentUpdateRecord = null;
const pendingRequests = new Map();

const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupSearch();
  setupUpdate();
  setupModal();
  setupCopyButtons();
  showPage("searchPage"); // หน้าแรกต้องเป็นค้นหาเสมอ
});

function setupNavigation() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => showPage(btn.dataset.page));
  });
}

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active-page"));
  $(pageId).classList.add("active-page");

  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (pageId === "searchPage") $("navSearch").classList.add("active");
  if (pageId === "updatePage") $("navUpdate").classList.add("active");

  if (pageId === "searchPage") resetSearchView();
  if (pageId === "updatePage") resetUpdateView();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupSearch() {
  $("searchBtn").addEventListener("click", runSearch);
  $("searchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") runSearch();
  });

  $("backBtn").addEventListener("click", resetSearchView);
  $("incompleteBtn").addEventListener("click", () => {
    $("incompleteRemark").value = "";
    $("incompleteModal").classList.remove("hidden");
    setTimeout(() => $("incompleteRemark").focus(), 50);
  });

  $("closeJobBtn").addEventListener("click", async () => {
    if (!currentSearchRecord) return;
    const ok = confirm("ยืนยันการปิดงานรายการนี้?");
    if (!ok) return;

    try {
      showLoading(true);
      const res = await apiRequest("closeJob", { row: currentSearchRecord.row });
      if (!res.success) throw new Error(res.message || "บันทึกไม่สำเร็จ");
      toast("บันทึกสำเร็จ");
      setTimeout(() => resetSearchView(), 650);
    } catch (err) {
      toast(err.message || "เกิดข้อผิดพลาด");
    } finally {
      showLoading(false);
    }
  });
}

async function runSearch() {
  const q = $("searchInput").value.trim();
  if (!q) {
    toast("กรุณากรอกเลข PR / PO / Code");
    $("searchInput").focus();
    return;
  }

  try {
    showLoading(true);
    const res = await apiRequest("searchABC", { q });
    if (!res.success || !res.record) {
      currentSearchRecord = null;
      $("searchResult").classList.add("hidden");
      $("searchEmpty").classList.remove("hidden");
      $("searchEmpty").innerHTML = `
        <div class="info-icon">!</div>
        <div><strong>ไม่พบข้อมูล</strong><p>กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง</p></div>`;
      return;
    }
    currentSearchRecord = res.record;
    renderSearchResult(res.record);
  } catch (err) {
    toast(err.message || "เชื่อมต่อระบบไม่สำเร็จ");
  } finally {
    showLoading(false);
  }
}

function renderSearchResult(r) {
  $("searchEmpty").classList.add("hidden");
  $("searchResult").classList.remove("hidden");
  $("rPr").textContent = valueOrDash(r.pr);
  $("rPo").textContent = valueOrDash(r.po);
  $("rData").textContent = valueOrDash(r.data);
  $("rSupplier").textContent = valueOrDash(r.supplier);
  $("rPhone").textContent = valueOrDash(r.phone);
  $("rRemark").textContent = valueOrDash(r.remark);
  $("rStatus").textContent = valueOrDash(r.status);
  $("rUpdated").textContent = valueOrDash(r.updatedAt);
  $("statusBadge").textContent = valueOrDash(r.status);
}

function resetSearchView() {
  currentSearchRecord = null;
  $("searchInput").value = "";
  $("searchResult").classList.add("hidden");
  $("searchEmpty").classList.remove("hidden");
  $("searchEmpty").innerHTML = `
    <div class="info-icon">⌕</div>
    <div><strong>พร้อมค้นหาข้อมูล</strong><p>กรอกข้อมูลด้านบนแล้วกด “ค้นหา”</p></div>`;
  $("incompleteModal").classList.add("hidden");
}

function setupModal() {
  $("modalClose").addEventListener("click", closeModal);
  $("modalCancel").addEventListener("click", closeModal);
  $("incompleteModal").addEventListener("click", e => {
    if (e.target === $("incompleteModal")) closeModal();
  });

  $("modalSave").addEventListener("click", async () => {
    if (!currentSearchRecord) return;
    const remark = $("incompleteRemark").value.trim();
    if (!remark) {
      toast("กรุณาระบุรายละเอียด");
      return;
    }
    try {
      showLoading(true);
      const res = await apiRequest("updateRemark", {
        row: currentSearchRecord.row,
        remark
      });
      if (!res.success) throw new Error(res.message || "บันทึกไม่สำเร็จ");
      closeModal();
      toast("บันทึกสำเร็จ");
      setTimeout(() => resetSearchView(), 650);
    } catch (err) {
      toast(err.message || "เกิดข้อผิดพลาด");
    } finally {
      showLoading(false);
    }
  });
}

function closeModal() {
  $("incompleteModal").classList.add("hidden");
}

function setupUpdate() {
  $("updateSearchBtn").addEventListener("click", runUpdateSearch);
  $("updateSearchInput").addEventListener("keydown", e => {
    if (e.key === "Enter") runUpdateSearch();
  });

  $("updateForm").addEventListener("submit", async e => {
    e.preventDefault();
    if (!currentUpdateRecord) return;

    try {
      showLoading(true);
      const res = await apiRequest("updateRecord", {
        row: currentUpdateRecord.row,
        po: $("fPo").value.trim(),
        supplier: $("fSupplier").value.trim(),
        phone: $("fPhone").value.trim(),
        remark: $("fRemark").value.trim()
      });
      if (!res.success) throw new Error(res.message || "บันทึกไม่สำเร็จ");
      toast("บันทึกสำเร็จ");
      setTimeout(() => resetUpdateView(), 650);
    } catch (err) {
      toast(err.message || "เกิดข้อผิดพลาด");
    } finally {
      showLoading(false);
    }
  });
}

async function runUpdateSearch() {
  const pr = $("updateSearchInput").value.trim();
  if (!pr) {
    toast("กรุณากรอกเลข PR");
    $("updateSearchInput").focus();
    return;
  }

  try {
    showLoading(true);
    const res = await apiRequest("searchPR", { pr });
    if (!res.success || !res.record) {
      currentUpdateRecord = null;
      $("updateForm").classList.add("hidden");
      $("updateEmpty").classList.remove("hidden");
      $("updateEmpty").innerHTML = `
        <div class="info-icon">!</div>
        <div><strong>ไม่พบข้อมูล</strong><p>กรุณาตรวจสอบเลข PR</p></div>`;
      return;
    }

    currentUpdateRecord = res.record;
    $("updateEmpty").classList.add("hidden");
    $("updateForm").classList.remove("hidden");
    $("editingPrPill").textContent = `PR ${valueOrDash(res.record.pr)}`;
    $("fPo").value = res.record.po || "";
    $("fSupplier").value = res.record.supplier || "";
    $("fPhone").value = res.record.phone || "";
    $("fRemark").value = res.record.remark || "";
  } catch (err) {
    toast(err.message || "เชื่อมต่อระบบไม่สำเร็จ");
  } finally {
    showLoading(false);
  }
}

function resetUpdateView() {
  currentUpdateRecord = null;
  $("updateSearchInput").value = "";
  $("updateForm").classList.add("hidden");
  $("updateEmpty").classList.remove("hidden");
  $("updateEmpty").innerHTML = `
    <div class="info-icon">↻</div>
    <div><strong>พร้อมอัพเดทข้อมูล</strong><p>กรอกเลข PR ด้านบนเพื่อเปิดแบบฟอร์ม</p></div>`;
  ["fPo","fSupplier","fPhone","fRemark"].forEach(id => $(id).value = "");
}

function setupCopyButtons() {
  document.querySelectorAll("[data-copy-target]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const target = $(btn.dataset.copyTarget);
      const text = target.textContent === "-" ? "" : target.textContent;
      if (!text) {
        toast("ไม่มีข้อมูลให้คัดลอก");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        toast("คัดลอกแล้ว");
      } catch {
        fallbackCopy(text);
      }
    });
  });
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
  toast("คัดลอกแล้ว");
}

function valueOrDash(v) {
  return (v === null || v === undefined || String(v).trim() === "") ? "-" : String(v);
}

function showLoading(show) {
  $("loading").classList.toggle("hidden", !show);
}

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");
  toastTimer = setTimeout(() => $("toast").classList.add("hidden"), 2200);
}

// =====================================================
// Cross-origin API bridge via hidden POST form + iframe
// ไม่ใช้ fetch จึงหลีกเลี่ยงปัญหา CORS ของ GitHub Pages -> Apps Script
// =====================================================
function apiRequest(action, payload = {}) {
  if (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE_YOUR_")) {
    return Promise.reject(new Error("ยังไม่ได้ตั้งค่า API_URL ใน app.js"));
  }

  const requestId = "req_" + Date.now() + "_" + Math.random().toString(36).slice(2);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error("หมดเวลารอการตอบกลับจากระบบ"));
    }, 20000);

    pendingRequests.set(requestId, { resolve, reject, timeout });

    const form = document.createElement("form");
    form.method = "POST";
    form.action = CONFIG.API_URL;
    form.target = "apiFrame";
    form.style.display = "none";

    const fields = {
      action,
      payload: JSON.stringify(payload),
      requestId,
      token: CONFIG.API_TOKEN
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);
  });
}

window.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.source !== "PR_PO_DASHBOARD_API" || !data.requestId) return;

  const pending = pendingRequests.get(data.requestId);
  if (!pending) return;

  clearTimeout(pending.timeout);
  pendingRequests.delete(data.requestId);

  if (data.ok) pending.resolve(data.result);
  else pending.reject(new Error(data.error || "API error"));
});
