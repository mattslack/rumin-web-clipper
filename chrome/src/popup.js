/* global FormData, chrome, fetch */
(function () {
  let title
  let pageUrl
  let customFields = {}
  let popover

  const apiHost = 'https://api.dreamhousedesign.com'

  const readCookie = (name) => {
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (var c of ca) {
      while (c.charAt(0) === ' ') c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

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

  /*
  function sendMsgToContentScript (msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {})
    })
  }
  */

  chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    if (req.pageContext) {
      popover = buildPopover()
      const backdrop = document.createElement('div')
      backdrop.setAttribute('id', 'dhd-backdrop')
      backdrop.appendChild(popover)
      document.body.appendChild(backdrop)

      console.log(popover)
      popover.querySelector('#save_btn').addEventListener('click', onSave)
      popover.querySelector('#sign-in-form').addEventListener('submit', onSignIn)

      const signInTabBtn = popover.querySelector('#lookup_tab_btn')
      const saveTabBtn = popover.querySelector('#save_tab_btn')

      if (readCookie('access_token') === null) {
        selectTab({ target: signInTabBtn })
        saveTabBtn.disabled = true
      }

      const renderPreview = function (src) {
        const previewWrapper = document.querySelector('#thumbnail')
        while (previewWrapper.firstElementChild) {
          previewWrapper.firstElementChild.remove()
        }
        previewWrapper.insertAdjacentHTML('afterbegin', `<img src="${src}" alt="" class="thumbnail">`)
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
        if (customFields.url !== undefined) {
          renderPreview(customFields.url)
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
  })

  const buildPopover = () => {
    popover = document.createElement('div')
    popover.setAttriute('id', 'dhd-popover')

    popover.insertAdjacentHTML('afterbegin', `
      <div class="tabs">
        <button id="save_tab_btn"
             data-content="save_tab"
             class="tab active">
          Save
        </button>
        <button id="lookup_tab_btn"
             data-content="lookup_tab"
             class="tab">
           Sign In
        </button>
      </div>
      <div id="save_tab"
           class="capture-container">
        <div class="capture-form-container">
          <div class="form-group" id="thumbnail"></div>
          <div class="form-group">
            <label for="captured_title_field" class="field-label">
              Title
            </label>
            <input type="text"
                 id="captured_title_field"
                 class="title-field form-control"
                 placeholder="Untitled page"
                 autofocus="true"
                 maxlength="300">
          </div>
          <div class="captured-selection">
            <div id="captured_selection"></div>
          </div>
          <div class="form-group">
            <label for="captured_note_field" class="field-label">
              Note
            </label>
            <textarea id="captured_note_field"
                 class="note-field form-control"
                 placeholder=""></textarea>
          </div>
          <!-- Advanced section, for configuring fields -->
          <div id="custom_fields_section"
               class="hidden"
               style="padding: 0.5em 0">
            <div id="custom_fields_heading"
                 class="section-heading flex">
              <div class="text">
                Properties
              </div>
            </div>
            <div id="custom_fields"
                 class="custom-fields-content">
            </div>
          </div>
        </div>
        <div class="save-btn-container">
          <button type="submit" disabled="disabled" id="save_btn"
               class="btn btn-primary form-control">
            Save
          </button>
        </div>
      </div>
      <div id="lookup_tab" class="section-container hidden">
        <form method="post" action="https://api.dreamhousedesign.com/api/token" id="sign-in-form">
          <div class="form-group">
            <input type="hidden" name="grant_type" value="password">
            <label class="field-label" for="email">Email</label>
            <input class="form-control" type="email" autocomplete="email" id="email" name="username">
            <br>
            <label class="field-label" for="password">Password</label>
            <input class="form-control" type="password" autocomplete="password" id="password" name="password">
          </div>
          <div class="save-btn-container">
            <input type="submit" value="Sign In" class="btn btn-primary form-control">
          </div>
        </form>
      </div>
    `)

  }
  const onSave = (event) => {
    const saveButton = event.currentTarget
    // disable button
    saveButton.innerHTML('<div style="width: 100%; text-align: center"><img src="images/spinner.webp" width="32" height="32" style="margin: auto; display: block" /><p><small>Saving...Do not close this</small></p></div>')
    saveButton.setAttribute('class', '')

    const url = `${apiHost}/api/clipboard`
    const data = activityData()

    const saveMe = () => {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${readCookie('access_token')}`,
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
          document.cookie = `access_token=${json.access_token};`
          saveTabBtn.disabled = false
          selectTab({ target: saveTabBtn })
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

})()
