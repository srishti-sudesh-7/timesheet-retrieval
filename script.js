const TOKEN = "insert token here";

const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${TOKEN}`
};

let users = [];
let activities = [];
let projects = [];
let allTimesheets = [];

let salaryMap = {};

async function fetchTimesheets(){
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    if(!startDate||!endDate){
        alert("Select both dates");
        return;
    }

    allTimesheets = [];

    const usersResponse = await fetch( "https://knightledger.iouring.in/api/users", {headers});
    const activityResponse = await fetch(`https://knightledger.iouring.in/api/activities`,{headers});
    const projectsResponse = await fetch('https://knightledger.iouring.in/api/projects', {headers});

    users = await usersResponse.json();
    activities = await activityResponse.json();
    projects = await projectsResponse.json();
    
    const projectSelect = document.getElementById("projectSelect");

    projectSelect.innerHTML = "";
    projects.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = p.name;
        projectSelect.appendChild(option);
    });

    const activityMap = {};
    const projectMap = {};

    activities.forEach(a => {activityMap[a.id] = a.name});
    projects.forEach(p => {projectMap[p.id] = p.name});

    const tbody = document.querySelector("#timesheetTable tbody");
    tbody.innerHTML="";

    for(const user of users){
        const response = await fetch(
            `https://knightledger.iouring.in/api/timesheets?user=${user.id}`,{headers}
        );

        const timesheets = await response.json();
        //console.log(user.username, timesheets);

        const filtered = timesheets.filter(e=>{
            const date = e.begin.split("T")[0];
            return date>=startDate && date<=endDate;
        });

        filtered.forEach(e=>{
            allTimesheets.push({
            userId: user.id,
            project: e.project,
            duration: e.duration,
            date: e.begin.split("T")[0]
        });

            const hrs = Math.floor(e.duration/3600);
            const mins = Math.floor((e.duration%3600)/60);
            const row = tbody.insertRow();

            row.insertCell().innerText=user.username;
            row.insertCell().innerText=projectMap[e.project] ;
            row.insertCell().innerText=activityMap[e.activity] ;
            row.insertCell().innerText=e.description;
            row.insertCell().innerText=`${hrs}h ${mins}m`;
            row.insertCell().innerText=e.begin.split("T")[0];
        });
    }
}

function showDefaulters(){
    const startDate = new Date(document.getElementById("startDate").value);
    const endDate = new Date(document.getElementById("endDate").value);
    const output = document.getElementById("defaulters");

    output.innerHTML="<h3>Timesheet Defaulters</h3>";

    users.forEach(user=>{
        let missing=[];
        for(let d=new Date(startDate); d<=endDate; d.setDate(d.getDate()+1)){
            const current = d.toISOString().split("T")[0];
            const exists=allTimesheets.some(t=>
                t.userId==user.id &&
                t.date===current
            );
            if(!exists) missing.push(current);
        }

        if(missing.length)
            output.innerHTML+=`<p><b>${user.username}</b><br>${missing.join(", ")}</p>`;

    });
}

function loadSalaryCSV() {
    const file = document.getElementById("salaryFile").files[0];
    if (!file){ alert("Select a CSV file"); return; }

    const reader = new FileReader();
    reader.onload = function(event) {
        const text = event.target.result;
        const lines = text.trim().split("\n");
        salaryMap = {};
        for(let i = 1; i < lines.length; i++) {
            const [userId, ctc] = lines[i].split(",");
            salaryMap[Number(userId)] = Number(ctc);
        }
        //console.log(salaryMap);
        alert("Salary file loaded");
    };
    reader.readAsText(file);
}


function calculateProjectCost() {
    const selectedProject = Number(
        document.getElementById("projectSelect").value
    );

    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value;

    const projectEntries = allTimesheets.filter(t =>
        t.project === selectedProject &&
        t.date >= startDate &&
        t.date <= endDate
    );

    let total = 0;
    projectEntries.forEach(e => {
        const annual = salaryMap[e.userId];
        if (!annual) return;
        const hourly = annual / (8*5*52);
        const hrs = e.duration / 3600;
        const cost = hourly * hrs;
        total += cost;
    });

    document.getElementById("projectCost").innerHTML =`<h3>Total Project Cost: ₹${total.toFixed(2)}</h3>`;
}
}
