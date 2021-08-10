const $id = (id) => { return document.getElementById(id); }

const $class = (cl) => { return document.getElementsByClassName(cl); }

const showNewEntry = () => {
	$id("site-inp").value = "";
	$id("uname-inp").value = "";
	$id("psw-inp").value = "";
	$id("empty-err").style.visibility = "hidden";
	$id("new-entry-modal-div").style.display = "block";
	$id("site-inp").focus();
}

const hideNewEntry = () => { $id("new-entry-modal-div").style.display = "none"; }

const showInfo = () => { $id("info-modal-div").style.display = "block"; }

const hideInfo = () => { $id("info-modal-div").style.display = "none"; }

const hideCard = () => { $id("card-modal-div").style.display = "none"; }

const showSettings = () => { $id("settings-modal-div").style.display = "block"; }

const hideSettings = () => { $id("settings-modal-div").style.display = "none"; }

const showExpmne = () => {
	hideSettings();
	$id("expmne-modal-div").style.display = "flex";
	$id("mne-holder").innerHTML = algo.getNumberedMn();
}

const hideExpmne = () => { $id("expmne-modal-div").style.display = "none"; }

const showFeedback = () => {
	hideInfo();
	$id("feedback-modal-div").style.display = "flex";
}

const hideFeedback = () => { $id("feedback-modal-div").style.display = "none"; }

const showMpacc = () => { $id("mne-modal-div").style.display = "flex"; }

const showMpenter = () => {
	$id("mp-modal-div").style.display = "flex";
	$id("login-psw").focus();
}

const hideMpenter = () => { $id("mp-modal-div").style.display = "none"; }

const showMneErr = () => { $id("mne-err-text").style.visibility = "visible"; }

const showMpErr = () => {
	$id("mp-err-text").style.visibility = "visible";
	$id("login-psw").select();
}

const showEmptyErr = () => { $id("empty-err").style.visibility = "visible"; }

const updateBal = async () => { $id("algo-balance").innerHTML = await algo.getShortBal(); }

const getCardHTML = (id, site, uname) => {
	return `
<div class="card" id="card-${id}">
	<p class="card-site-text">${site}</p>
	<p class="card-user-text">${uname}</p>
</div>
`
}

const getNoCardHTML = () => {
	return `
<div id="no-card-div">
	<div">
		No entries found<br><br>
		Top up your wallet with 1 Algo<br>
		and add your first entry to get started<br><br>
		<span style="font-size: 0.9em;">Your public key:<br></span>
		<canvas id="no-card-canvas"></canvas>
		<span style="font-size: 0.65em">${algo.getAddr()}</span>
	</div>
</div>
`

}

const getCardModalHTML = (site, uname, psw) => {
	return `
<h3>${site}</h3>

<div id="uname">
	<label><b>Username</b></label>
	<input id="uname-card" type="text" value="${uname}" readonly>
</div>

<div id="psw">
	<label><b>Password</b></label>
	<input id="psw-card" type="text" value="${psw}" readonly>
</div>

<!--
<div id="card-btns">
	<button id="edit-btn" type="submit" class="modal-func-btn">Edit</button>
	<button id="delete-btn" type="submit" class="modal-func-btn">Delete</button>
</div>
pencil + cross
-->

<button id="card-close-btn" class="modal-close-btn">Close</button>
`
}

const clickCard = (id, cards) => {
	let {website, user, password} = cards[id];
	$id("card-modal-div").style.display = "block";
	$id("card-modal").innerHTML = getCardModalHTML(website, user, password);
	$id("card-close-btn").addEventListener("click", hideCard);
}

const codeToCanvas = (addr, canvas_id) => {
	QRCode.toCanvas(
		$id(canvas_id),
		{wallet: addr, label: "@AlgoPass"},
	);
}

const updateCards = async () => {
	let card_holder = $id("card-holder");
	let cards = await algo.getEntries();

	card_holder.innerHTML = cards.length == 0 ? getNoCardHTML() : "";
	if ($id("no-card-canvas")) codeToCanvas(algo.getAddr(), "no-card-canvas");

	cards.forEach(
		(card, i) => card_holder.innerHTML += getCardHTML(i, card.website, card.user)
	);

	Array.from($class("card")).forEach(
		(card, i) => card.addEventListener("click", () => clickCard(i, cards))
	);
}

const setCS = async (key, val) => {
	return new Promise(resolve => {
		chrome.storage.sync.set({[key]: val}, resolve);
	});
}
const getCS = async (key) => {
	return new Promise(resolve => {
		chrome.storage.sync.get(key, res => {
			resolve(res[key]);
		});
	});
}
const clearCS = async (key) => {
	return new Promise(resolve => {
		chrome.storage.sync.remove(key, resolve);
	});
}

const unlockAlgo = async () => {
	return new Promise(resolve => {
		showMpenter();
		let inp = $id("login-psw");
		$id("submit-mp-btn").addEventListener("click", async () => {
			try {
				await algo.getAcc(inp.value);
				hideMpenter();
				resolve();
			} catch (e) {
				showMpErr();
			}
		});

		$id("mp-modal").addEventListener("keyup", event => {
			if (event.keyCode === 13) $id("submit-mp-btn").click();
		});

		$id("forgot-psw").addEventListener("click", async () => {
			await algo.clearMn();
			location.reload();
		});
	});
}

const main = async () => {
	if (await algo.getEncMn() == undefined) {
		showMpacc();

		$id("submit-psw-btn").addEventListener("click", async () => {
			let recovery;
			let recVal = $id("rec-acc").value;
			if (recVal != "") {
				try {
					algosdk.mnemonicToSecretKey(recVal);
					recovery = recVal;
				} catch (e) {
					$id("rec-err-text").style.visibility = "visible";
					return;
				}               
			}

			let psw = $id("enter-psw");
			let cpsw = $id("confirm-psw");

			if (psw.value == "" || psw.value != cpsw.value) showMneErr();
			else {
				await algo.setAcc(psw.value, recovery);
				location.reload();
			}
		});

		$id("mne-modal").addEventListener("keyup", event => {
			if (event.keyCode === 13) $id("submit-psw-btn").click();
		});

		return;
	}

	await unlockAlgo();
	
	// Top bar + modals

	$id("new-entry-div").addEventListener("click", showNewEntry);
	$id("new-entry-close-btn").addEventListener("click", hideNewEntry);

	$id("info-icon-div").addEventListener("click", showInfo);
	$id("info-close-btn").addEventListener("click", hideInfo);

	$id("settings-icon-div").addEventListener("click", showSettings);
	$id("settings-close-btn").addEventListener("click", hideSettings);
	codeToCanvas(algo.getAddr(), "settings-canvas");

	$id("expmne-close-btn").addEventListener("click", hideExpmne);

	$id("feedback-a").addEventListener("click", showFeedback);
	$id("feedback-btn").addEventListener("click", () => {
		window.open(
			"mailto:info.algopass@gmail.com?subject=AlgoPass Feedback&body=" +
			$id("feedback-box").value
		);
	});
	$id("feedback-close-btn").addEventListener("click", hideFeedback);


	$id("pa-textbox").value = algo.getAddr();

	$id("exp-mne-btn").addEventListener("click", showExpmne);

	let copy_mne_btn = $id("copy-mne-btn");
	let mne_holder = $id("copy-mne-holder");

	copy_mne_btn.addEventListener("click", () => {
		mne_holder.style.display = "block";
		mne_holder.value = algo.getMn();
		mne_holder.select();
		document.execCommand("copy");
		mne_holder.innerHTML = "";
		mne_holder.style.display = "none";

		copy_mne_btn.innerHTML = "Copied!<br><span style='font-size: 0.7em;'>Paste it somewhere safe</span>";
	});

	await updateBal();

	Array.from($class("modal-div")).forEach(modal_div => {
		window.onclick = (event) => {
			if (event.target.className.split(" ").includes("modal-div")) {
				hideNewEntry();
				hideInfo();
				hideCard();
				hideSettings();
				hideFeedback();
			}
		}
	});

	// Load cards

	updateCards();

	// New entry modal script

	$id("save-btn").addEventListener("click", async () => {

		let site = $id("site-inp").value;
		let uname = $id("uname-inp").value;
		let psw = $id("psw-inp").value;

		if (site != "" && uname != "" && psw != "" && await algo.getBal() != 0) {
			await algo.saveEntry(site, uname, psw);
			let txn_status = $id("txn-status");

			txn_status.style.visibility = "visible";
			setTimeout(() => {
				txn_status.style.visibility = "hidden";
				hideNewEntry();
			}, 2500);
		} else {
			showEmptyErr();
		}
	});

	$id("new-entry-modal").addEventListener("keyup", event => {
		if (event.keyCode === 13) $id("save-btn").click();
	});

	// Update bal and cards every 3 seconds

	let loop = window.setInterval(() => {
		updateBal();
		updateCards();
		}, 3000);
}

const algo = new Algo();
main();