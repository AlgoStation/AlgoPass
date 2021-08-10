class Algo {
	constructor() {
		this.baseURL = "https://algoexplorerapi.io";
	}

	async saveEntry(site, uname, pws) {
		let note = {
			website: site,
			user: uname,
			password: pws,
		}

		note = this.encrypt(note, this.mn);

		note = await algosdk.encodeObj(note);
		
		await this.makeTxn(note);
	}

	async getParams() {
		let url = this.baseURL + "/v2/transactions/params";

		let response = await fetch(url);
		let data = await response.json();

		let params = {
			firstRound: data["last-round"],
			lastRound: data["last-round"] + 1000,
			genesisID: data["genesis-id"],
			genesisHash: data["genesis-hash"],
			fee: 1000,
			flatFee: true,
		}

		return params;
	}

	async makeTxn(note) {
		let params = await this.getParams();

		let txn = algosdk.makePaymentTxnWithSuggestedParams(
			this.acc.addr,
			this.acc.addr,
			0,
			undefined,
			note,
			params
		)

		let stxn = txn.signTxn(this.acc.sk);

		await this.sendRawTxn(stxn);
	}

	async sendRawTxn(stxn) {
		let url = this.baseURL + "/v2/transactions";

		let response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-binary"
			},
			body: stxn
		});
		let data = await response.json();
	}

	async getTxns(address) {
		let url = this.baseURL + `/idx2/v2/transactions?address=${address}&address-role=sender`;

		let response = await fetch(url);
		let data = await response.json();
		let txns = data.transactions;
		return txns;
	}

	async getEntries() {
		let txns = await this.getTxns(this.acc.addr);

		let notes = txns.map(txn => {
			let note = txn.note;
			note = atob(note);
			note = note.slice(2);
			note = this.decrypt(note, this.mn);
			return note;
		});

		return notes;
	}

	async getBal() {
		let url = this.baseURL + `/v2/accounts/${this.acc.addr}`
		let response = await fetch(url);
		let data = await response.json();

		return data.amount;
	}

	async getShortBal() {
		let bal = ((await this.getBal() + 1) / 1000000).toString();
		bal = bal.substring(0, bal.indexOf('.') + 4);
		return bal;
	}

	async setAcc(psw, recovery) {
		let mn;

		if (recovery) {
			mn = recovery;
		} else {
			let acc = algosdk.generateAccount();
			mn = algosdk.secretKeyToMnemonic(acc.sk);
		}

		let eMn = this.encrypt(mn, psw);
		await setCS("mn", eMn);
	}

	async getEncMn() {
		if (this.enc_mn == undefined) this.enc_mn = await getCS("mn");
		return this.enc_mn;
	}

	async getAcc(psw) {
		if (this.acc == undefined) {
			this.mn = this.decrypt(await this.getEncMn(), psw);
			this.acc = algosdk.mnemonicToSecretKey(this.mn);
		}
		return this.acc;
	}

	async clearMn() { await clearCS("mn"); }

	getNumberedMn() {
		let mn = this.mn.split(" ");
		let numbered = mn.map((word, i) => ` ${i+1}. ${word}`);
		return (""+numbered).trim();
	}

	encrypt(msg, key) {
		return CryptoJS.AES.encrypt(JSON.stringify(msg), key).toString();
	}

	decrypt(msg, key) { 
		return JSON.parse(CryptoJS.AES.decrypt(msg, key).toString(CryptoJS.enc.Utf8));
	}

	getMn() { return this.mn; }

	getAddr() { return this.acc.addr; }
}