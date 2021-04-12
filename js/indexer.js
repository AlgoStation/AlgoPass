function isEncrypted(str) {
	return str[0] == 'Ù';
}

function decrypt(msg, key) {
	var code = CryptoJS.AES.decrypt(msg, key);
	var decryptedMsg = code.toString(CryptoJS.enc.Utf8);

	return decryptedMsg;
}

function isBase64(str) {
	if (str.trim() === '') return false;
	try {
		return btoa(atob(str)) == str;
	} catch (err) {
		return false;
	}
}

async function showTxns() {
	chrome.storage.sync.get(['client', 'mnemonic'], async function (data) {
		const indexerClient = new algosdk.Indexer(data.client.token, data.client.indexer, data.client.port);
		const account = algosdk.mnemonicToSecretKey(data.mnemonic);

		let txnSearch = await indexerClient.searchForTransactions()
			.address(account.addr)
			.do()
		// Someone could spam your account with thousands of txns
		// Implement something to search through more than 1000

		let accountTxns = txnSearch.transactions;

		let notesStr = [];

		accountTxns.forEach(txn => {
			if (txn.note) {
				let note = txn.note;

				if (!isBase64(note)) return;
				note = atob(note);

				if (!isEncrypted(note)) return;
				note = note.slice(2);
				note = decrypt(note, data.mnemonic);

				if (note == '') return;
				notesStr.push(note);
			} else return;
		});

		let notes = [];
		notesStr.forEach(n => notes.push(JSON.parse(n)));
		
		let pencil = "<i class='fa fa-fw fa-pencil inner-icon pencil'></i>";
		let cross = "<i class='fa fa-fw fa-times inner-icon cross'></i>";

		notes.forEach((n) => {
			let row = document.getElementById("data").insertRow(-1);

			for (let field in n) {
				row.insertCell(-1).innerHTML = n[field];
			}
			
			row.insertCell(-1).innerHTML = pencil;
			row.insertCell(-1).innerHTML = cross;
		});

		document.getElementById("website").innerHTML = "Website";
		document.getElementById("username").innerHTML = "Username";
		document.getElementById("password").innerHTML = "Password";

		document.getElementById("fetching").innerHTML = '';
	});
}

showTxns();