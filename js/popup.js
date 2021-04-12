let elements = {
	newAccountBox: document.getElementById("newAccountBox"),
	importAccountBox: document.getElementById("importAccountBox"),
	importedAccountBox: document.getElementById("importedAccount"),
	isApiBox: document.getElementById("isApiBox"),
	isLocalBox: document.getElementById("isLocalBox"),
	submitButton: document.getElementById("submitButton"),

	// API divs
	noApiDiv: document.getElementById("no-api"),
	apiDiv: document.getElementById("api"),

	// API elements
	apiIndexerAddressBox: document.getElementById("apiIndexerAddressBox"),
	apiAlgodAddressBox: document.getElementById("apiAlgodAddressBox"),
	apiTokenBox: document.getElementById("apiTokenBox"),

	// No-API elements
	addressBox: document.getElementById("addressBox"),
	tokenBox: document.getElementById("tokenBox"),
	portBox: document.getElementById("portBox"),

	exportButton: document.getElementById("exportButton"),
	logoutButton: document.getElementById("logoutButton")
};

let radio;
let api;

elements.importAccountBox.addEventListener("change", radioOn);
elements.newAccountBox.addEventListener("change", radioOff);
elements.isApiBox.addEventListener("change", apiOn);
elements.isLocalBox.addEventListener("change", apiOff);
elements.submitButton.addEventListener("click", submit);
elements.exportButton.addEventListener("click", exportData);
elements.logoutButton.addEventListener("click", logout);

function radioOn() {
	document.getElementById("importAccountDiv").style.display = "block";
	radio = true;
}

function radioOff() {
	document.getElementById("importAccountDiv").style.display = "none";
	radio = false;
}

function apiOn() {
	elements.noApiDiv.style.display = "none";
	elements.apiDiv.style.display = "block";
	api = true;
}

function apiOff() {
	elements.apiDiv.style.display = "none";
	elements.noApiDiv.style.display = "block";
	api = false;
}

function checkSubmission() {
	let data = {};

	if (radio == undefined) {
		alert("Account field cannot be empty");
		return null;
	}

	if (radio == true) {
		let inp = elements.importedAccountBox.value;

		try {
			algosdk.mnemonicToSecretKey(inp);
		} catch (err) {
			alert("Mnemonic entered is invalid");
			console.log(err);
			return null;
		}

		data.mnemonic = inp;
	} else {
		let account = algosdk.generateAccount();

		data.mnemonic = algosdk.secretKeyToMnemonic(account.sk);
	}

	if (api == undefined) {
		alert("Node field cannot be empty");
		return null;
	}

	if (api == true) {
		let fields = {
			algod: apiAlgodAddressBox.value,
			indexer: apiIndexerAddressBox.value,
			token: {
				"X-API-Key": apiTokenBox.value
			},
			port: ''
		}

		if (fields.indexer == '' || fields.algod == '' || fields.token["X-API-Key"] == '') {
			alert("API fields cannot be empty");
			return null;
		}

		data.client = fields;
	} else {
		let fields = {
			algod: addressBox.value,
			indexer: addressBox.value,
			token: tokenBox.value,
			port: portBox.value
		}

		if (fields.address == '' || fields.token == '' || fields.port == '') {
			alert("Local node fields cannot be empty");
			return null;
		}

		data.client = fields;
	}
	return data;
}

function submit() {
	let submission = checkSubmission();

	if (submission !== null) {
		chrome.storage.sync.set(submission, function () {
			alert("Account set!");
			location.reload();
		});
	}
}

function exportData() {
	chrome.storage.sync.get(['mnemonic'], function (data) {
		if (confirm("Are you sure you want to see your mnemonic? Keep it safe!")) {
			alert(data.mnemonic);
		}
	});
}

function logout() {
	chrome.storage.sync.clear(function () {
		alert("Logged out!");
		location.reload();
	});
}

function updateState() {
	chrome.storage.sync.get(['mnemonic'], function (data) {
		if (typeof data.mnemonic === "undefined") {
			document.getElementById("no-account").style.display = "block";
		} else {
			document.getElementById("account-found").style.display = "block";
		}
	});
}

updateState();