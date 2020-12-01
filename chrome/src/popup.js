/* global FormData, chrome, fetch */
(function () {
  let token
  let title
  let pageUrl
  let customFields = {}
  const popover = document.querySelector('#dhd-popover')
  if (popover === null) return

  const apiHost = 'https://api.dreamhousedesign.com'

  function activityData () {
    title = popover.querySelector('#captured_title_field')
    let notes = popover.querySelector('#captured_note_field')
    if (title !== null) title = title.value
    if (notes !== null) notes = notes.value

    const params = Object.assign({}, {
      title: title,
      source_url: pageUrl,
      notes: notes || ''
    }, customFields)
    params.url = document.querySelector('input[name=url]:checked').value

    return params
  }

  function buildCustomField (name, value) {
    if (typeof value === 'object') {
      value = JSON.stringify(value, null, 2)
    }

    return (`
      <div style="margin-bottom: 0.5em;">
        <div class="prop-name" style="margin-right: 0.5em;">${name}:</div>
        <div class="prop-value">${value}</div>
      </div>
    `)
  }

  function sendMsgToContentScript (msg) {
    console.log(msg)
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {
        if (response && response.message === 'token_saved') {
          saveTabBtn.disabled = false
          selectTab({ target: saveTabBtn })
          token = response.token
        }
      })
    })
  }

  chrome.runtime.sendMessage({ popupOpen: true })

  chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    if (req.token === undefined) {
      selectTab({ target: signInTabBtn })
      saveTabBtn.disabled = true
    } else {
      token = req.token
    }
    if (req.pageContext) {
      const renderPreviews = function () {
        const previewWrapper = document.querySelector('#thumbnails')
        while (previewWrapper.firstElementChild) {
          previewWrapper.firstElementChild.remove()
        }
        req.pageContext.images.forEach((image, index) => {
          previewWrapper.insertAdjacentHTML('afterbegin', `
            <input type="radio" form="save_tab" id="image_${index}" name="url" value="${image}">
            <label for="image_${index}"><img src="${image}" alt="" class="thumbnail"></label>
          `)
        })
      }
      const titleField = popover.querySelector('#captured_title_field')

      if (!title || (title && title.trim() === '')) {
        title = req.pageContext.titleOverride ? req.pageContext.titleOverride : sender.tab.title
        title = title.slice(0, 300)
      }

      pageUrl = req.pageContext.urlOverride ? req.pageContext.urlOverride : sender.tab.url
      customFields = req.pageContext.customFields

      if (title.trim() !== '') {
        titleField.value = title.trim()
      } else {
        titleField.value = pageUrl
      }

      if (Object.keys(customFields).length > 0) {
        popover.querySelector('#custom_fields_section').classList.remove('hidden')

        const divider = '<div class="divider"></div>'

        if (customFields.notes !== undefined) {
          popover.querySelector('#captured_note_field').value = customFields.notes
          delete customFields.notes
        }
        if (customFields.page_title !== undefined && customFields.page_title === title) {
          delete customFields.page_title
        }
        renderPreviews()
        if (customFields.url !== undefined) {
          popover.querySelector('#save_btn').disabled = false
        }
        const customFieldElements = Object.keys(customFields).map(fieldName => {
          return buildCustomField(fieldName, customFields[fieldName])
        }).join(divider)

        popover.querySelector('#custom_fields').innerHTML = `
          <div>
            ${customFieldElements}
          </div>`
      }
    }
    sendResponse()
  })

  const onSave = (event) => {
    event.preventDefault()
    const saveButton = event.currentTarget
    // disable button
    saveButton.innerHTML = '<div style="width: 100%; text-align: center"><img src="images/spinner.webp" width="32" height="32" style="margin: auto; display: block" /><p><small>Saving...Do not close this</small></p></div>'
    saveButton.setAttribute('class', '')

    const url = `${apiHost}/api/clipboard`
    const data = activityData()

    const saveMe = () => {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (response.status === 201) {
            popover.querySelector('.capture-container').innerHTML = '<p>The content is successfully saved.</p>'
          } else if (response.status === 401) {
            popover.querySelector('.save-btn-container').innerHTML = '<p>Looks like your session is expired. Please sign in again.</p>'
          } else {
            popover.querySelector('.save-btn-container').innerHTML = `<p>Looks there was a problem saving. <a href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(response))}">Send a bug report</a>.</p>`
          }
        })
        .catch((error) => {
          popover.querySelector('.save-btn-container').innerHTML = `<p>Looks there was a problem saving. <a href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(error))}">Send a bug report</a>.</p>`
        })
    }

    saveMe()
  }
  const onSignIn = (event) => {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    fetch(event.currentTarget.getAttribute('action'), {
      method: 'POST',
      body: fd
    })
      .then((res) => {
        res.json().then(json => {
          console.log(json)
          sendMsgToContentScript({ message: 'save_session', token: json })
        })
      })
      .catch((error) => {
        console.log(error)
      })
  }

  const selectTab = (event) => {
    if (event.target.classList.contains('tab')) {
      if (event.type) event.stopImmediatePropagation()
      const tabs = Array.from(popover.querySelectorAll('.tab'))
      tabs.forEach((tab) => {
        tab.classList.toggle('active', tab === event.target)
        popover.querySelector(`#${tab.dataset.content}`).classList.toggle('hidden', tab !== event.target)
      })
    }
  }

  popover.querySelector('#save_btn').addEventListener('click', onSave)
  popover.querySelector('#sign-in-form').addEventListener('submit', onSignIn)

  const signInTabBtn = popover.querySelector('#lookup_tab_btn')
  const saveTabBtn = popover.querySelector('#save_tab_btn')

  Array.from(document.querySelectorAll('.tab')).forEach(tab => tab.addEventListener('click', selectTab))
})()
