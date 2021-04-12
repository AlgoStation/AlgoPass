document.getElementById("algodButton").addEventListener("click", algodButton);

function algodButton() {
	let msg = {
		A : document.getElementById("Website").value,
		B : document.getElementById("Username").value,
		C : document.getElementById("Password").value
	};
	
	if (msg.A == '' || msg.B == '' || msg.C == '') {
		alert("Must provide note contents!");
	} else {
		chrome.storage.sync.get(['mnemonic'], function (data) {
			let encryptedMsg = encrypt(JSON.stringify(msg), data.mnemonic);
			selfTxn(encryptedMsg, data.mnemonic);
		});
	}
}

function encrypt(msg, key) {
	var res = CryptoJS.AES.encrypt(msg, key);
	return res.toString();
}

async function selfTxn(msg, mnemonic) {
	chrome.storage.sync.get(['client'], async function (data) {
		const algodClient = new algosdk.Algodv2(data.client.token, data.client.algod, data.client.port);
		const account = algosdk.mnemonicToSecretKey(mnemonic);

		let params = await algodClient.getTransactionParams().do();
		params.fee = 1000;
		params.flatFee = true;

		let note = algosdk.encodeObj(msg);

		let txn = algosdk.makePaymentTxnWithSuggestedParams(
			account.addr, account.addr, 0, undefined, note, params
		);

		let signedTxn = txn.signTxn(account.sk);
		await algodClient.sendRawTransaction(signedTxn).do();

		alert("Transaction sent!");
		location.reload();
	});
}