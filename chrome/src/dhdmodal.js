/* global FormData, chrome, fetch  */
class DHDModal { /* eslint-disable-line no-unused-vars */
  constructor (pageContext) {
    const customFields = pageContext.customFields
    this.pageContext = pageContext

    this.apiHost = 'https://api.dreamhousedesign.com'
    this.customFields = customFields
    this.pageUrl = pageContext.urlOverride ? pageContext.urlOverride : window.location.href
    this.token = pageContext.token

    const backdrop = document.createElement('div')
    backdrop.setAttribute('id', 'dhd-popover-backdrop')
    this.backdrop = backdrop
  }

  get activityData () {
    let title = this.popover.querySelector('#captured_title_field')
    let notes = this.popover.querySelector('#captured_note_field')
    if (title !== null) title = title.value
    if (notes !== null) notes = notes.value

    const params = Object.assign({}, {
      title: title,
      source_url: this.pageUrl,
      notes: notes || ''
    }, this.customFields)
    params.url = document.querySelector('input[name=url]:checked').value

    this.title = params.title
    this.notes = params.notes

    return params
  }

  build () {
    const popover = document.createElement('div')
    popover.setAttribute('id', 'dhd-popover')
    popover.insertAdjacentHTML('afterbegin', `
      <div class="overlay">
        <div id="thumbnails">
        </div>
        <div id="fields">
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
          <form id="save_tab"
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
          </form>
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
        </div>
      </div>
    `)
    this.backdrop.appendChild(popover)
    document.body.appendChild(this.backdrop)
    document.body.style.setProperty('overflow', 'hidden')
    popover.querySelector('#save_btn').addEventListener('click', (event) => this.onSave(event))
    popover.querySelector('#sign-in-form').addEventListener('submit', (event) => this.onSignIn(event))

    this.signInTabBtn = popover.querySelector('#lookup_tab_btn')
    this.saveTabBtn = popover.querySelector('#save_tab_btn')

    Array.from(document.querySelectorAll('.tab')).forEach(tab => tab.addEventListener('click', (event) => this.onSelectTab(event)))
    if (this.token === undefined) {
      this.onSelectTab({ target: this.signInTabBtn })
      this.saveTabBtn.disabled = true
    }
    document.addEventListener('keydown', (event) => this.onKeydown(event))
    this.popover = popover
  }

  buildCustomField (name, value) {
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

  destroy () {
    this.backdrop.remove()
    document.body.style.removeProperty('overflow')
  }

  onKeydown (event) {
    if (event.key === 'Escape') {
      document.removeEventListener('keydown', (event) => this.onKeydown(event))
      this.destroy()
    }
  }

  onSave (event) {
    event.preventDefault()
    const saveButton = event.currentTarget
    // disable button
    saveButton.innerHTML = '<div style="width: 100%; text-align: center"><img src="images/spinner.webp" width="32" height="32" style="margin: auto; display: block" /><p><small>Saving...Do not close this</small></p></div>'
    saveButton.setAttribute('class', '')

    const url = `${this.apiHost}/api/clipboard`
    const data = this.activityData

    const saveMe = () => {
      fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      })
        .then((response) => {
          if (response.status === 201) {
            this.popover.querySelector('.capture-container').innerHTML = '<p>The content is successfully saved.</p>'
          } else if (response.status === 401) {
            this.popover.querySelector('.save-btn-container').innerHTML = '<p>Looks like your session is expired. Please sign in again.</p>'
          } else {
            this.popover.querySelector('.save-btn-container').innerHTML = `<p>Looks there was a problem saving. <a href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(response))}">Send a bug report</a>.</p>`
          }
        })
        .catch((error) => {
          this.popover.querySelector('.save-btn-container').innerHTML = `<p>Looks there was a problem saving. <a href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(error))}">Send a bug report</a>.</p>`
        })
    }

    saveMe()
  }

  onSelectTab = (event) => {
    if (event.target.classList.contains('tab')) {
      if (event.type) event.stopImmediatePropagation()
      const tabs = Array.from(this.popover.querySelectorAll('.tab'))
      tabs.forEach((tab) => {
        tab.classList.toggle('active', tab === event.target)
        this.popover.querySelector(`#${tab.dataset.content}`).classList.toggle('hidden', tab !== event.target)
      })
    }
  }

  onSignIn (event) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    fetch(event.currentTarget.getAttribute('action'), {
      method: 'POST',
      body: fd
    })
      .then((res) => {
        res.json().then(json => {
          const token = json.access_token
          console.log(token)
          chrome.storage.local.set({ token: token }, () => {
            this.saveTabBtn.disabled = false
            this.onSelectTab({ target: this.saveTabBtn })
            this.token = token
          })
        })
      })
      .catch((error) => {
        console.log(error)
      })
  }

  populate () {
    const titleField = this.popover.querySelector('#captured_title_field')
    let title = this.title

    if (!title || (title && title.trim() === '')) {
      title = this.pageContext.titleOverride ? this.pageContext.titleOverride : document.title
      title = title.slice(0, 300)
    }
    if (title.trim() !== '') {
      titleField.value = title.trim()
    } else {
      titleField.value = this.pageUrl
    }

    this.title = title
    if (this.customFields && Object.keys(this.customFields).length > 0) {
      this.popover.querySelector('#custom_fields_section').classList.remove('hidden')

      const divider = '<div class="divider"></div>'

      if (this.customFields.notes !== undefined) {
        this.popover.querySelector('#captured_note_field').value = this.customFields.notes
        delete this.customFields.notes
      }
      if (this.customFields.page_title !== undefined && this.customFields.page_title === title) {
        delete this.customFields.page_title
      }
      this.renderPreviews()
      if (this.customFields.url !== undefined) {
        this.popover.querySelector('#save_btn').disabled = false
      }
      const customFieldElements = Object.keys(this.customFields).map(fieldName => {
        return this.buildCustomField(fieldName, this.customFields[fieldName])
      }).join(divider)

      this.popover.querySelector('#custom_fields').innerHTML = `
        <div>
          ${customFieldElements}
        </div>`
    }
  }

  renderPreviews () {
    const previewWrapper = this.popover.querySelector('#thumbnails')
    while (previewWrapper.firstElementChild) {
      previewWrapper.firstElementChild.remove()
    }
    this.pageContext.images.forEach((image, index) => {
      previewWrapper.insertAdjacentHTML('afterbegin', `
        <input type="radio" form="save_tab" id="image_${index}" name="url" value="${image}">
        <label for="image_${index}"><img src="${image}" alt="" class="thumbnail"></label>
      `)
    })
  }
}
