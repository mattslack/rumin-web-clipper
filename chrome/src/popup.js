/* global $, FormData, chrome, fetch */
(function () {
  let title
  let pageUrl
  let customFields = {}

  const apiHost = 'https://api.dreamhousedesign.com'

  const readCookie = (name) => {
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (var c of ca) {
      while (c.charAt(0) === ' ') c.cubstring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  function activityData () {
    title = $('#captured_title_field').val()
    const notes = $('#captured_note_field').val()

    const params = Object.assign({}, {
      title: title,
      source_url: pageUrl,
      notes: notes || ''
    }, customFields)

    if (window.selectedSpaces) {
      params.in_collections = window.selectedSpaces
    }

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
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, msg, function (response) {})
    })
  }

  chrome.runtime.sendMessage({ popupOpen: true })

  chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
    if (req.pageContext) {
      const renderPreview = function (src) {
        const previewWrapper = document.querySelector('#thumbnail')
        while (previewWrapper.firstElementChild) {
          previewWrapper.firstElementChild.remove()
        }
        previewWrapper.insertAdjacentHTML('afterbegin', `<img src="${src}" alt="" class="thumbnail">`)
      }

      if (!title || (title && title.trim() === '')) {
        title = req.pageContext.titleOverride ? req.pageContext.titleOverride : sender.tab.title
        title = title.slice(0, 300)
      }

      pageUrl = req.pageContext.urlOverride ? req.pageContext.urlOverride : sender.tab.url
      customFields = req.pageContext.customFields

      if (title.trim() !== '') {
        $('#captured_title_field').val(title.trim())
      } else {
        $('#captured_title_field').val(pageUrl)
      }

      if (Object.keys(customFields).length > 0) {
        $('#custom_fields_section').removeClass('hidden')

        const divider = '<div class="divider"></div>'

        console.log(customFields)
        if (customFields.notes !== undefined) {
          document.querySelector('#captured_note_field').value = customFields.notes
          delete customFields.notes
        }
        if (customFields.page_title !== undefined && customFields.page_title === title) {
          delete customFields.page_title
        }
        if (customFields.url !== undefined) {
          renderPreview(customFields.url)
          document.querySelector('#save_btn').disabled = false
        }
        const customFieldElements = Object.keys(customFields).map(fieldName => {
          return buildCustomField(fieldName, customFields[fieldName])
        }).join(divider)

        $('#custom_fields').html(`
          <div>
            ${customFieldElements}
          </div>
        `)
      }
    }
  })

  $(function () {
    $('#save_btn').click(function () {
      // disable button
      $('#save_btn').html('<div style="width: 100%; text-align: center"><img src="images/spinner.webp" width="32" height="32" style="margin: auto; display: block" /><p><small>Saving...Do not close this</small></p></div>')
      $('#save_btn').removeClass()

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
              document.querySelector('.capture-container').innerHTML = '<p>The content is successfully saved.</p>'
            } else if (response.status === 401) {
              document.querySelector('.save-btn-container').innerHTML = '<p>Looks like your session is expired. Please sign in again.</p>'
            } else {
              document.querySelector('.save-btn-container').innerHTML = `<p>Looks there was a problem saving. <a href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(response))}">Send a bug report</a>.</p>`
            }
          })
          .catch((error) => {
            document.querySelector('.save-btn-container').innerHTML = `<p>Looks there was a problem saving. <a href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(error))}">Send a bug report</a>.</p>`
          })
      }

      saveMe()
    })

    $('#custom_fields_heading').click(function () {
      $('.custom-fields-content').toggleClass('hidden')
      $('.custom_fields_display_icon').toggleClass('hidden')
    })

    const signInTabBtn = document.querySelector('#lookup_tab_btn')
    const saveTabBtn = document.querySelector('#save_tab_btn')

    const selectTab = (e) => {
      if (e.target.classList.contains('tab')) {
        if (e.type) e.stopImmediatePropagation()
        const tabs = Array.from(document.querySelectorAll('.tab'))
        tabs.forEach((tab) => {
          tab.classList.toggle('active', tab === e.target)
          document.getElementById(tab.dataset.content).classList.toggle('hidden', tab !== e.target)
        })
      }
    }

    if (readCookie('access_token') === null) {
      selectTab({ target: signInTabBtn })
      saveTabBtn.disabled = true
    }

    document.querySelector('#sign-in-form').addEventListener('submit', (event) => {
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
    })
  })
})()
