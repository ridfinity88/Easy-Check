// =============================
// CONFIG - แก้ 2 ค่านี้เท่านั้น
// =============================
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyNQvvylJ6NhycHjeFEoH0PogHJAb2uL_jWysslhLMkt0GsM6GWmUwgjwfk4dejjArBwA/exec",
  API_TOKEN: "RiD_FINITY_2026_V1"
};

let currentSearchRecord = null;
let currentUpdateRecord = null;
const $ = (id) => document.getElementById(id);

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupSearch();
  setupUpdate();
  setupBulkCopy();
  setupPromptLmTor();
  setupPromptLmPo();
  setupModal();
  setupCopyButtons();
  showPage("searchPage");
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
  if (pageId === "copyPage") $("navCopy").classList.add("active");

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

  $("closeJobBtn").addEventListener("click", () => {
    if (!currentSearchRecord) return;

    const po = String(currentSearchRecord.po || "").trim();
    const supplier = String(currentSearchRecord.supplier || "").trim();
    const phone = String(currentSearchRecord.phone || "").trim();
    const remark = String(currentSearchRecord.remark || "").trim();
    const hasAllCloseData = po !== "" && supplier !== "" && phone !== "" && remark !== "";

    $("closeJobPoInput").value = po;
    $("closeJobSupplierInput").value = supplier;
    $("closeJobPhoneInput").value = phone;
    $("closeJobRemarkInput").value = remark;
    $("closeJobRequiredFields").classList.toggle("hidden", hasAllCloseData);

    if (hasAllCloseData) {
      $("closeJobConfirm").textContent = "ยืนยันปิดงาน";
      $("closeJobConfirm").classList.remove("hidden");
    } else {
      $("closeJobConfirm").textContent = "บันทึกและปิดงาน";
      updateCloseJobConfirmState();
    }

    $("closeJobModal").classList.remove("hidden");

    if (!hasAllCloseData) {
      const firstEmptyInput = [
        "closeJobPoInput",
        "closeJobSupplierInput",
        "closeJobPhoneInput",
        "closeJobRemarkInput"
      ].map(id => $(id)).find(input => input.value.trim() === "");

      if (firstEmptyInput) {
        setTimeout(() => firstEmptyInput.focus(), 50);
      }
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
        <div>
          <strong>ไม่พบข้อมูล</strong>
          <p>กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง</p>
        </div>`;
      return;
    }

    currentSearchRecord = res.record;
    renderSearchResult(res.record);

  } catch (err) {
    console.error(err);
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
  $("resultCodeKicker").textContent = valueOrDash(r.code);

  const isClosed = String(r.status || "").trim() === "รับของครบแล้ว";
  $("statusBadge").classList.toggle("status-closed", isClosed);
}

function resetSearchView() {
  currentSearchRecord = null;
  $("searchInput").value = "";
  $("searchResult").classList.add("hidden");
  $("statusBadge").classList.remove("status-closed");
  $("searchEmpty").classList.remove("hidden");
  $("searchEmpty").innerHTML = `
    <div class="info-icon">⌕</div>
    <div>
      <strong>พร้อมค้นหาข้อมูล</strong>
      <p>กรอกข้อมูลด้านบนแล้วกด “ค้นหา”</p>
    </div>`;
  $("incompleteModal").classList.add("hidden");
  $("closeJobModal").classList.add("hidden");
  $("closeJobRequiredFields").classList.add("hidden");
  $("closeJobPoInput").value = "";
  $("closeJobSupplierInput").value = "";
  $("closeJobPhoneInput").value = "";
  $("closeJobRemarkInput").value = "";
  $("closeJobConfirm").classList.remove("hidden");
  $("closeJobConfirm").textContent = "ยืนยันปิดงาน";
  $("resultCodeKicker").textContent = "-";
}

function setupModal() {
  $("modalClose").addEventListener("click", closeModal);
  $("modalCancel").addEventListener("click", closeModal);

  $("incompleteModal").addEventListener("click", e => {
    if (e.target === $("incompleteModal")) closeModal();
  });

  $("closeJobModalX").addEventListener("click", closeCloseJobModal);
  $("closeJobCancel").addEventListener("click", closeCloseJobModal);

  $("closeJobModal").addEventListener("click", e => {
    if (e.target === $("closeJobModal")) closeCloseJobModal();
  });

  [
    "closeJobPoInput",
    "closeJobSupplierInput",
    "closeJobPhoneInput",
    "closeJobRemarkInput"
  ].forEach(id => {
    $(id).addEventListener("input", updateCloseJobConfirmState);
  });

  $("closeJobConfirm").addEventListener("click", async () => {
    if (!currentSearchRecord) return;

    const currentPo = String(currentSearchRecord.po || "").trim();
    const currentSupplier = String(currentSearchRecord.supplier || "").trim();
    const currentPhone = String(currentSearchRecord.phone || "").trim();
    const currentRemark = String(currentSearchRecord.remark || "").trim();
    const hasAllCloseData = currentPo !== "" && currentSupplier !== "" && currentPhone !== "" && currentRemark !== "";

    const po = hasAllCloseData ? currentPo : $("closeJobPoInput").value.trim();
    const supplier = hasAllCloseData ? currentSupplier : $("closeJobSupplierInput").value.trim();
    const phone = hasAllCloseData ? currentPhone : $("closeJobPhoneInput").value.trim();
    const remark = hasAllCloseData ? currentRemark : $("closeJobRemarkInput").value.trim();

    if (!hasAllCloseData && (!po || !supplier || !phone || !remark)) {
      toast("กรุณากรอกข้อมูลให้ครบทั้ง 4 ช่อง");
      updateCloseJobConfirmState();
      return;
    }

    closeCloseJobModal();

    try {
      showLoading(true);

      const res = await apiRequest("closeJob", {
        row: currentSearchRecord.row,
        po: po,
        supplier: supplier,
        phone: phone,
        remark: remark
      });

      if (!res.success) {
        throw new Error(res.message || "บันทึกไม่สำเร็จ");
      }

      toast("บันทึกสำเร็จ");
      setTimeout(resetSearchView, 650);

    } catch (err) {
      console.error(err);
      toast(err.message || "เกิดข้อผิดพลาด");
    } finally {
      showLoading(false);
    }
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
      setTimeout(resetSearchView, 650);

    } catch (err) {
      console.error(err);
      toast(err.message || "เกิดข้อผิดพลาด");
    } finally {
      showLoading(false);
    }
  });
}

function closeModal() {
  $("incompleteModal").classList.add("hidden");
}

function closeCloseJobModal() {
  $("closeJobModal").classList.add("hidden");
  $("closeJobRequiredFields").classList.add("hidden");
  $("closeJobPoInput").value = "";
  $("closeJobSupplierInput").value = "";
  $("closeJobPhoneInput").value = "";
  $("closeJobRemarkInput").value = "";
  $("closeJobConfirm").classList.remove("hidden");
  $("closeJobConfirm").textContent = "ยืนยันปิดงาน";
}

function updateCloseJobConfirmState() {
  const po = $("closeJobPoInput").value.trim();
  const supplier = $("closeJobSupplierInput").value.trim();
  const phone = $("closeJobPhoneInput").value.trim();
  const remark = $("closeJobRemarkInput").value.trim();
  const complete = po !== "" && supplier !== "" && phone !== "" && remark !== "";

  $("closeJobConfirm").classList.toggle("hidden", !complete);
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
      setTimeout(resetUpdateView, 650);

    } catch (err) {
      console.error(err);
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
        <div>
          <strong>ไม่พบข้อมูล</strong>
          <p>กรุณาตรวจสอบเลข PR</p>
        </div>`;
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
    console.error(err);
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
    <div>
      <strong>พร้อมอัพเดทข้อมูล</strong>
      <p>กรอกเลข PR ด้านบนเพื่อเปิดแบบฟอร์ม</p>
    </div>`;

  ["fPo", "fSupplier", "fPhone", "fRemark"].forEach(id => {
    $(id).value = "";
  });
}

function setupPromptLmTor() {
  const promptLmTor = "จากไฟล์ที่แนบไปต้องการให้หาข้อมูลมาตอบตามหัวข้อ\nฉันตัองการเป็นข้อความอย่างเดียว กดคัดลอกต้องไม่มีอะไรติดมา เช่น *, [] , ตัวเลขหรืออื่นใดที่แสดงถึงแหล่งข้อมูลไม่ต้องใส่มา ตอบตามคำสั่งเลยไม่ต้องอธิบาย ไม่ต้องรีบ ขอละเอียดถูกต้องห้ามผิดพลาดเด็ดขาด และทำตามเงื่อนไขอย่างเคร่งครัด ***สำคัญมาก ให้ตอบเป็นของบรรทัดใครบรรทัดมัน ไม่เอาแบบทั้งหมดมาต่อกัน ให้แยกตามข้อ ข้อละ 1 บรรทัด และเว้นวรรค 2 ครั้ง (Spacebar 2 ครั้ง) ที่ท้ายทุกบรรทัดก่อนขึ้นบรรทัดใหม่เสมอ เพื่อให้หน้าจอแสดงผลแยกบรรทัดอย่างถูกต้อง\n\n1.ชื่องาน + วัตถุประสงค์ ตอบแบบต่อกันไม่ต้องมี + ติดมา (ตอบเลย ไม่ต้องระบุ 1. นำหน้า)\n2.มีรายการที่ขอซื้ออะไรบ้าง ตอบบรรทัดละ 1 รายการจนครบ (ตอบเลย ไม่ต้องระบุ 2. นำหน้า)\n3.SP-01-050 ตอบ SP-01-050 มาเลย (ตอบเลย ไม่ต้องระบุ 3. นำหน้า)\n4.ในชื่อมี ID อะไร เช่น ABC01A ถ้าไม่มี ให้ตอบ ไม่มี (ตอบเลย ไม่ต้องระบุ 4. นำหน้า)\n5.Cost Center (ตอบเลย ไม่ต้องระบุ 5. นำหน้า)\n6.เลข Order (ตอบเลย ไม่ต้องระบุ 6. นำหน้า)\n/////////////////////////////// (ใส่มาตามนี้เลย เพื่อจะไว้ดูให้เห็นชัดเจนว่าคนละส่วนกัน)\n7.มีรายการที่ขอซื้ออะไรบ้าง จำนวน หน่วย ราคาจากใบเสนอราคา ***ในส่วนของ ราคาจากใบเสนอราคา ถ้าไม่มี ไม่ต้องใส่มา ขอรายการละ 1 บรรทัด\n\nโดยให้ตอบตามรูปแบบดังต่อไปนี้\n\nชื่องาน + วัตถุประสงค์\nรายการที่ขอซื้อ (ตอบบรรทัดละ 1 รายการจนครบ)\nSP-01-050\nID\nCost Center\nOrder\n///////////////////////////////\nมีรายการที่ขอซื้อ (จำนวน หน่วย) (ราคาจากใบเสนอราคา บาท #ไม่ต้อง ,) ***ใส่ () ตามตัวอย่าง และในส่วนของ ราคาจากใบเสนอราคา ถ้าไม่มี ไม่ต้องใส่มา ขอรายการละ 1 บรรทัด";

  $("promptLmTorBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(promptLmTor);
      toast("คัดลอก Prompt LM TOR แล้ว");
    } catch {
      fallbackCopy(promptLmTor);
    }
  });
}

function setupPromptLmPo() {
  const promptLmPo = `จากไฟล์ที่แนบไปต้องการให้หาข้อมูลมาตอบตามหัวข้อ ฉันตัองการเป็นข้อความอย่างเดียว กดคัดลอกต้องไม่มีอะไรติดมา เช่น *, [] , ตัวเลขหรืออื่นใดที่แสดงถึงแหล่งข้อมูลไม่ต้องใส่มา ตอบตามคำสั่งเลยไม่ต้องอธิบาย ไม่ต้องรีบ ขอละเอียดถูกต้องห้ามผิดพลาดเด็ดขาด และทำตามเงื่อนไขอย่างเคร่งครัด ***สำคัญมาก ให้ตอบเป็นของบรรทัดใครบรรทัดมัน ไม่เอาแบบทั้งหมดมาต่อกัน ให้แยกตามข้อ ข้อละ 1 บรรทัด และเว้นวรรค 2 ครั้ง (Spacebar 2 ครั้ง) ที่ท้ายทุกบรรทัดก่อนขึ้นบรรทัดใหม่เสมอ เพื่อให้หน้าจอแสดงผลแยกบรรทัดอย่างถูกต้อง

1.เลขที่ใบขอซื้อ หรือ เลขที่ขอซื้อ โดย จะขึ้นต้นด้วย 430 ถ้าไม่ได้ขึ้นด้วย 430 นั้นคือไม่มีข้อมูล ถ้าไม่มีข้อมูลให้ใส่ ไม่พบข้อมูล (ตอบเลย ไม่ต้องระบุ 1. นำหน้า)
2.เลขที่เอกสาร โดย จะขึ้นต้นด้วย 405 ถ้าไม่ได้ขึ้นด้วย 405 นั้นคือไม่มีข้อมูล ถ้าไม่มีข้อมูลให้ใส่ ไม่พบข้อมูล (ตอบเลย ไม่ต้องระบุ 2. นำหน้า)
3.ผู้ขาย หรือ ชื่อบริษัท (ตอบเลย ไม่ต้องระบุ 3. นำหน้า และไม่เอาตัวเลขที่อยู่หน้าชื่อ เอาแต่ชื่อ)
4.เบอร์ติดต่อ ถ้าไม่มี ให้เอาข้อมูลจากชื่อผู้ขาย และที่อยู่ ไปค้นหา เบอร์ติดต่อ ของผู้ขาย จากแหล่งข้อมูลอื่น บนออนไลน์ ถ้าหาไม่ได้ให้ตอบ ไม่พบข้อมูล (ตอบเลย ไม่ต้องระบุ 4. นำหน้า)
5.รวมมูลค่าสินค้า หรือ ตัวเลขราคาที่เป็นตัวใหญ่สีแดง มีเงื่อนดังนี้
ถ้าน้อยกว่า 150000 ให้ตอบ งานปกติทั่วไป
ถ้ามากกว่า 149999 และไม่ถึง 499999 ให้ตอบ ต้องมีใบรับประกัน และตรวจรับมอบงาน
ถ้ามากกว่า 499999 ให้ตอบ สำคัญมาก ต้องทำสัญญา (ตอบเลย ไม่ต้องระบุ 5. นำหน้า)

โดยให้ตอบตามรูปแบบดังต่อไปนี้

430 หรือ ไม่พบข้อมูล
405 หรือ ไม่พบข้อมูล
ผู้ขาย
เบอร์ติดต่อ (ใส่แค่ตัวเลข - ไม่ต้องใส่มา) หรือ ไม่พบข้อมูล
ต้องมีใบรับประกัน และตรวจรับมอบงาน หรือ สำคัญมาก ต้องทำสัญญา หรือ งานปกติทั่วไป`;

  $("promptLmPoBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(promptLmPo);
      toast("คัดลอก Prompt LM PO แล้ว");
    } catch {
      fallbackCopy(promptLmPo);
    }
  });
}

function setupBulkCopy() {
  $("processCopyBtn").addEventListener("click", () => {
    const raw = $("bulkCopyInput").value;
    const lines = raw
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (!lines.length) {
      toast("กรุณาใส่ข้อมูลอย่างน้อย 1 บรรทัด");
      $("bulkCopyInput").focus();
      return;
    }

    renderBulkCopyResults(lines);
    $("bulkCopyInput").value = "";
    $("bulkCopyInput").focus();
  });
}

function renderBulkCopyResults(lines) {
  const list = $("copyResultList");
  list.innerHTML = "";

  lines.forEach((line, index) => {
    const row = document.createElement("div");
    row.className = "copy-result-row";

    const textWrap = document.createElement("div");
    textWrap.className = "copy-result-text-wrap";

    const no = document.createElement("span");
    no.className = "copy-row-no";
    no.textContent = String(index + 1);

    const text = document.createElement("div");
    text.className = "copy-result-text";
    text.textContent = line;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "mini-btn copy-row-btn";
    button.textContent = "คัดลอก";
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(line);
        toast("คัดลอกแล้ว");
      } catch {
        fallbackCopy(line);
      }
    });

    textWrap.appendChild(no);
    textWrap.appendChild(text);
    row.appendChild(textWrap);
    row.appendChild(button);
    list.appendChild(row);
  });

  $("copyCountPill").textContent = `${lines.length} รายการ`;
  $("copyEmpty").classList.add("hidden");
  $("copyResultCard").classList.remove("hidden");
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
  return (v === null || v === undefined || String(v).trim() === "")
    ? "-"
    : String(v);
}

function showLoading(show) {
  $("loading").classList.toggle("hidden", !show);
}

let toastTimer;
function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = message;
  $("toast").classList.remove("hidden");

  toastTimer = setTimeout(() => {
    $("toast").classList.add("hidden");
  }, 2500);
}

// =====================================================
// JSONP API
// ใช้งานได้กับ GitHub Pages / LINE Browser โดยไม่ติด CORS
// =====================================================
function apiRequest(action, payload = {}) {
  if (!CONFIG.API_URL || CONFIG.API_URL.includes("PASTE_YOUR_")) {
    return Promise.reject(new Error("ยังไม่ได้ตั้งค่า API_URL ใน app.js"));
  }

  return new Promise((resolve, reject) => {
    const callbackName =
      "__jsonp_" +
      Date.now() +
      "_" +
      Math.random().toString(36).slice(2);

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("หมดเวลารอการตอบกลับจากระบบ"));
    }, 20000);

    function cleanup() {
      clearTimeout(timeoutId);
      try { delete window[callbackName]; } catch {}
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    }

    window[callbackName] = function(response) {
      cleanup();

      if (!response) {
        reject(new Error("ไม่ได้รับข้อมูลจากระบบ"));
        return;
      }

      if (response.ok === false) {
        reject(new Error(response.error || "API error"));
        return;
      }

      resolve(response.result || response);
    };

    const params = new URLSearchParams();

    params.set("action", action);
    params.set("token", CONFIG.API_TOKEN);
    params.set("callback", callbackName);
    params.set("_ts", String(Date.now()));

    Object.entries(payload).forEach(([key, value]) => {
      params.set(key, value == null ? "" : String(value));
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = CONFIG.API_URL + "?" + params.toString();

    script.onerror = () => {
      cleanup();
      reject(new Error("ไม่สามารถเชื่อมต่อ Google Apps Script ได้"));
    };

    document.head.appendChild(script);
  });
}
