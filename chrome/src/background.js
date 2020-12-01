/* global chrome */
// Called when the user clicks on the browser action. but doesn't work if there's a popup
// chrome.browserAction.onClicked.addListener(function(tab) {
//   console.log("browserAction onClicked");
// });

function sendMsgToContentScript (msg) {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {})
  })
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.popupOpen) {
    // console.log('popup is open');

    sendMsgToContentScript({ message: 'clicked_browser_action' })
  }
})

const onSaveToDreamHouse = (info, tab) => {
  sendMsgToContentScript({ message: 'save_to_dream_house', info: info, tab: tab })
}

chrome.contextMenus.onClicked.addListener(onSaveToDreamHouse)
chrome.contextMenus.create({
  contexts: ['image'],
  title: 'Save to DreamHouse'
})
