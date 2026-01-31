// --- DATA INIT ---
let tankers = JSON.parse(localStorage.getItem("tankers")) || [
    { id: "T1", area: "Mira Road East", status: "Available" },
    { id: "T2", area: "Bhayander", status: "Available" }
];
let requests = JSON.parse(localStorage.getItem("requests")) || [];

// --- AUTH ---
function loginAs(role) {
    sessionStorage.setItem("userRole", role);
    if (role === 'Resident') window.location.href = "index.html";
    else if (role === 'Vendor') window.location.href = "vendor.html";
    else if (role === 'Admin') window.location.href = "admin.html";
}

function logout() {
    sessionStorage.clear();
    window.location.href = "login.html";
}

// --- BOOKING LOGIC (ID Fix) ---
const bookingForm = document.getElementById("bookingForm");
if (bookingForm) {
    bookingForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const qtyValue = document.getElementById("custQty").value;
        const nameValue = document.getElementById("custName").value;
        const areaValue = document.getElementById("custArea").value;

        const newID = "REQ" + Date.now(); // Unique ID generation

        const req = {
            id: newID,
            name: nameValue,
            area: areaValue,
            qty: qtyValue,
            status: "Pending",
            tankerId: "Not Assigned",
            estimatedTime: "Calculating...",
            updatedAt: new Date().toLocaleString()
        };
        
        requests.push(req);
        localStorage.setItem("requests", JSON.stringify(requests));
        alert("Request Submitted! ID: " + newID);
        window.location.href = "track.html?id=" + newID;
    });
}

// --- VENDOR LOGIC ---
function renderVendor() {
    const list = document.getElementById("vendorContent");
    if(!list) return;
    const reqs = JSON.parse(localStorage.getItem("requests")) || [];
    const tks = JSON.parse(localStorage.getItem("tankers")) || tankers;

    let html = "<h3>Fleet Status</h3><div style='display:flex; gap:10px;'>";
    tks.forEach(t => { html += `<div class='card' style='flex:1'><strong>${t.id}</strong><br>Status: ${t.status}</div>`; });
    html += "</div><h3>Customer Requests</h3>";

    const active = reqs.filter(r => r.status !== "Delivered");
    active.forEach(r => {
        html += `<div class='card'>
            <p>ID: ${r.id} | Area: ${r.area} | Qty: ${r.qty}L</p>
            <p>Status: <b>${r.status}</b></p>
            ${r.status === "Pending" ? 
                `<button onclick="updateFlow('${r.id}', 'Accepted', 'T1')">Accept (T1)</button> 
                 <button onclick="updateFlow('${r.id}', 'Accepted', 'T2')">Accept (T2)</button>` : ""}
            ${r.status === "Accepted" ? `<button style='background:orange; color:white' onclick="updateFlow('${r.id}', 'On the Way', '${r.tankerId}')">Start Delivery</button>` : ""}
            ${r.status === "On the Way" ? `<button style='background:green; color:white' onclick="updateFlow('${r.id}', 'Delivered', '${r.tankerId}')">Mark Delivered</button>` : ""}
        </div>`;
    });
    list.innerHTML = html;
}

function updateFlow(rid, stat, tid) {
    let allReqs = JSON.parse(localStorage.getItem("requests"));
    let allTks = JSON.parse(localStorage.getItem("tankers")) || tankers;
    
    const ri = allReqs.findIndex(r => r.id === rid);
    if(ri === -1) return;

    allReqs[ri].status = stat;
    allReqs[ri].tankerId = tid;
    allReqs[ri].updatedAt = new Date().toLocaleString();

    // ETA Logic
    if(stat === 'Accepted') allReqs[ri].estimatedTime = "30 Mins";
    else if(stat === 'On the Way') allReqs[ri].estimatedTime = "15 Mins";
    else if(stat === 'Delivered') allReqs[ri].estimatedTime = "Arrived";

    const ti = allTks.findIndex(t => t.id === tid);
    if(ti !== -1) allTks[ti].status = (stat === "Delivered") ? "Available" : "Busy";

    localStorage.setItem("requests", JSON.stringify(allReqs));
    localStorage.setItem("tankers", JSON.stringify(allTks));
    renderVendor();
}

// --- TRACKING LOGIC (Progress Bar & Feedback Fix) ---
function initTracking() {
    const params = new URLSearchParams(window.location.search);
    let id = params.get("id");
    const reqs = JSON.parse(localStorage.getItem("requests")) || [];
    if (!id && reqs.length > 0) id = reqs[reqs.length - 1].id;

    const r = reqs.find(x => x.id === id);
    if (r) {
        document.getElementById("trackID").innerText = r.id;
        document.getElementById("trackStatus").innerText = r.status;
        document.getElementById("tankerInfo").innerText = r.tankerId;
        document.getElementById("estTime").innerText = r.estimatedTime;
        document.getElementById("lastUpdated").innerText = r.updatedAt;
        
        const fill = document.getElementById("progressBar");
        if(fill) {
            // Precise Progress Logic
            if(r.status === "Pending") fill.style.width = "20%";
            else if(r.status === "Accepted") fill.style.width = "50%";
            else if(r.status === "On the Way") fill.style.width = "80%";
            else if(r.status === "Delivered") {
                fill.style.width = "100%";
                // Feedback Box trigger
                const fBox = document.getElementById("feedbackBox");
                if(fBox) fBox.style.display = "block";
            }
        }
    }
}

// --- ADMIN RENDER ---
function renderAdmin() {
    const tbody = document.getElementById("adminTable");
    if(!tbody) return;
    
    const allReqs = JSON.parse(localStorage.getItem("requests")) || [];
    const tks = JSON.parse(localStorage.getItem("tankers")) || tankers;

    // 1. Stats Update (Numbers)
    const statTotal = document.getElementById("statTotal");
    const statWater = document.getElementById("statWater");
    const statActive = document.getElementById("statActive");

    if(statTotal) statTotal.innerText = allReqs.length;
    if(statWater) {
        const totalWater = allReqs.filter(r => r.status === "Delivered").reduce((sum, r) => sum + Number(r.qty), 0);
        statWater.innerText = totalWater + " L";
    }
    if(statActive) statActive.innerText = tks.filter(t => t.status === "Busy").length;

    // 2. Table Render
    if (allReqs.length === 0) {
        tbody.innerHTML = "<tr><td colspan='6'>No requests found</td></tr>";
    } else {
        tbody.innerHTML = allReqs.map(r => `
            <tr>
                <td>${r.id}</td>
                <td>${r.name}</td>
                <td>${r.area}</td>
                <td>${r.qty}</td>
                <td>${r.tankerId}</td>
                <td>${r.status}</td>
            </tr>`).join('');
    }

    // 3. CHART LOGIC (Fixed & Optimized)
    // Counts nikalein
    const east = allReqs.filter(r => r.area === "Mira Road East").length;
    const west = allReqs.filter(r => r.area === "Mira Road West").length;
    const bhayander = allReqs.filter(r => r.area === "Bhayander").length;
    
    // Highest demand nikalein (Divide by zero se bachne ke liye 1 rakhein)
    const highestDemand = Math.max(east, west, bhayander, 1);

    // Bars update karein (Timeout ensures transition works)
    setTimeout(() => {
        const updateBar = (barId, count) => {
            const bar = document.getElementById(barId);
            if(bar) {
                // Calculation: (Count / Highest) * 100
                let heightPercent = (count / highestDemand) * 100;
                bar.style.height = count > 0 ? heightPercent + "%" : "8px"; // 8px for visibility even at 0
                
                // Bar ke upar number dikhane ke liye
                bar.innerHTML = `<span style="color:white; font-size:12px; font-weight:bold; position:absolute; top:-20px; color:#333;">${count}</span>`;
                bar.style.position = "relative";
            }
        };

        updateBar("barEast", east);
        updateBar("barWest", west);
        updateBar("barBhayander", bhayander);
    }, 300);
    console.log("JalSetu Project developed by Aastha Yadav");

}