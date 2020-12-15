/* global Event, FormData, chrome, fetch  */
class DHDModal { /* eslint-disable-line no-unused-vars */
  constructor (pageContext) {
    const customFields = pageContext.customFields
    this.pageContext = pageContext
    this.images = customFields.images
    delete customFields.images

    this.apiHost = 'https://api.dreamhousedesign.com'
    this.customFields = customFields
    this.pageUrl = pageContext.urlOverride ? pageContext.urlOverride : window.location.href
    this.token = pageContext.token

    const backdrop = document.createElement('div')
    backdrop.setAttribute('id', 'dhd-popover-backdrop')
    this.backdrop = backdrop
    this.build()
  }

  get activityData () {
    let title = this.popover.querySelector('#captured_title_field')
    let notes = this.popover.querySelector('#captured_note_field')
    if (title !== null) title = title.value
    if (notes !== null) {
      notes = notes.value
    } else {
      notes = ''
    }

    const selectedImage = document.querySelector('input[name=url]:checked')
    const url = selectedImage.labels[0].querySelector('img').getAttribute('src')
    const selectedImageFields = this.images[selectedImage.value]
    delete selectedImageFields.el

    if (selectedImageFields.topics) {
      this.customFields.topics = Object.assign(this.customFields.topics, selectedImageFields.topics)
    }

    delete this.customFields.page_title
    let params = {
      notes: notes,
      topics: []
    }
    if (title) {
      params.title = title
    }
    params = Object.assign(params, this.customFields)

    params.url = url

    this.title = params.title
    this.notes = params.notes

    console.log(params)
    return params
  }

  appendThumbnailHeader () {
    const wrapper = this.popover.querySelector('#thumbnails')
    wrapper.insertAdjacentHTML('afterbegin', '<div id="dhd-thumbnails-header"><p>Select one of the images below to save it to your Dream House Clipboard.</p></div>')
  }

  build () {
    const popover = document.createElement('div')
    const logo = chrome.extension.getURL('assets/logo.svg')
    popover.setAttribute('id', 'dhd-popover')
    popover.insertAdjacentHTML('afterbegin', `
      <div class="overlay">
        <div id="dhd-header">
          <h1 id="dhd-branding">
            <img src="${logo}" alt="Dream House Design" id="dhd-logo">
          </h1>
          <button id="dhd-sign-out" type="button" style="display: none;">
            Sign Out
          </button>
          <button class="dhd-close-button" id="dhd-close" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32">
              <path fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="4" d="M5,5 L27,27 M27,5 L5,27" />
            </svg>
          </button>
        </div>
      </div>
    `)
    this.backdrop.appendChild(popover)
    document.body.appendChild(this.backdrop)
    document.body.style.setProperty('overflow', 'hidden')
    popover.querySelector('#dhd-close').addEventListener('click', () => this.destroy())
    popover.querySelector('#dhd-sign-out').addEventListener('click', () => this.onSignOut())
    this.backdrop.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) {
        this.destroy()
      }
    })

    this.popover = popover
    document.addEventListener('keydown', (event) => this.onKeydown(event))
    this.saveForm = this.buildSaveForm()
    this.signInForm = this.buildSignInForm()

    if (this.token === undefined) {
      this.onSelectTab(this.signInForm)
    } else {
      this.onSelectTab(this.saveForm)
    }
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

  buildSaveForm () {
    const activate = () => {
      this.populate()
      onChange({ currentTarget: saveTab })
    }

    const onChange = (event) => {
      let valid = false
      const elements = event.currentTarget.elements
      valid = Array.from(elements).filter(element => element.getAttribute('name') === 'url').some(element => element.checked)
      this.toggleSave(valid)
    }

    const saveTab = document.createElement('form')
    saveTab.classList.add('tab')
    saveTab.setAttribute('id', 'dhd-save-form')
    saveTab.insertAdjacentHTML('afterbegin', `
      <form class="tab hidden" id="save-tab">
        <div id="thumbnails"></div>
        <div class="capture-container">
          <div class="capture-form-container">
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
            <div id="custom_fields_section"
                 style="padding: 0.5em 0">
              <div id="custom_fields_heading"
                   class="section-heading flex">
                <div class="text">
                  Properties
                </div>
              </div>
              <div id="custom_fields" class="custom-fields-content">
              </div>
            </div>
          </div>
          <div class="save-btn-container">
            <button type="submit"
              disabled="disabled"
              id="save_btn"
              class="btn btn-primary form-control">
              Add to Dream House Clipboard
            </button>
          </div>
        </div>
      </form>
    `)
    saveTab.addEventListener('activate', () => activate())
    saveTab.addEventListener('change', (event) => onChange(event))
    saveTab.addEventListener('submit', (event) => this.onSave(event))
    return saveTab
  }

  buildSignInForm () {
    const signInForm = document.createElement('form')
    signInForm.classList.add('tab', 'section-container')
    signInForm.setAttribute('id', 'sign-in-form')
    signInForm.setAttribute('method', 'post')
    signInForm.setAttribute('action', `${this.apiHost}/api/token`)
    signInForm.insertAdjacentHTML('afterbegin', `
      <div class="form-group">
        <input type="hidden" name="grant_type" value="password">
        <label class="field-label" for="email">Email</label>
        <input class="form-control" type="email" autocomplete="email" id="email" name="username">
        <br>
        <label class="field-label" for="password">Password</label>
        <input class="form-control" type="password" autocomplete="password" id="password" name="password">
      </div>
      <div class="sign-in-btn-container">
        <input type="submit" value="Sign In" class="btn btn-primary form-control">
      </div>
    `)
    signInForm.addEventListener('submit', (event) => this.onSignIn(event))
    return signInForm
  }

  closeMessage (event) {
    let message
    if (event) {
      message = event.currentTarget.closest('.dhd-message')
    } else {
      message = this.popover.querySelector('.dhd-message')
    }
    if (message) {
      message.remove()
    }
  }

  destroy () {
    window.clearTimeout(this.closeOut)
    this.backdrop.remove()
    document.body.style.removeProperty('overflow')
  }

  onExpired () {
    this.showMessage('Looks like your session is expired. Please <button type="button" class="btn btn--text">sign in again</button>.', 'warning')
    window.requestAnimationFrame(() => {
      this.popover.querySelector('.dhd-message .btn').addEventListener('click', () => {
        this.onSelectTab(this.signInForm)
      }, { once: true })
    })
  }

  onKeydown (event) {
    if (event.key === 'Escape') {
      document.removeEventListener('keydown', (event) => this.onKeydown(event))
      this.destroy()
    }
  }

  onSave (event) {
    event.preventDefault()
    this.toggleSave(false, 'Saving… Do not close this')

    const url = `${this.apiHost}/api/clipboard`
    const data = this.activityData

    console.log('onSave token:', this.token)
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
            this.closeWithMessage('The content was successfully saved', 'success')
          } else if (response.status === 401) {
            this.onExpired()
          } else if (response.status === 404) {
            this.showMessage('We couldn’t save that image. This site might prevent scraping.', 'error')
          } else {
            this.showMessage(`Looks there was a problem saving. <a class="btn btn--text" href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(response))}">Send a bug report</a>.`, 'error')
            this.toggleSave(true)
          }
        })
        .catch((error) => {
          this.showMessage(`
            Looks there was a problem saving.
            <a class="btn btn--text" href="mailto:dreamhouse@collectiveidea.com?subject=bug%20report&body=data:%20${encodeURIComponent(JSON.stringify(data))}\nresponse:%20${encodeURIComponent(JSON.stringify(error))}">
              Send a bug report
            </a>.
          `, 'error')
          this.toggleSave(true)
        })
    }

    saveMe()
    return false
  }

  onSelectTab = (newTab) => {
    const currentTab = this.popover.querySelector('.tab')
    const container = this.popover.querySelector('.overlay')
    if (currentTab) {
      if (newTab.id === currentTab.id) return
      const leftover = currentTab.querySelector('.dhd-message')
      if (leftover) leftover.remove()
      if (currentTab.id === 'dhd-save-form') {
        this.saveForm = currentTab
      } else {
        this.signInForm = currentTab
      }
      currentTab.remove()
    }
    container.appendChild(newTab)
    newTab.dispatchEvent(new Event('activate'))
  }

  onSignIn (event) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    fetch(event.currentTarget.getAttribute('action'), {
      method: 'POST',
      body: fd
    })
      .then((response) => {
        if (response.status === 201 || response.status === 200) {
          response.json().then(json => {
            const token = json.access_token
            console.log('received token:', token)
            chrome.storage.local.set({ token: token }, () => {
              this.onSelectTab(this.saveForm)
              this.signInForm.reset()
              this.token = token
              console.log('saved token:', this.token)
            })
          })
        }
        if (response.status === 401) {
          this.popover.querySelector('#sign-in-tab .form-group').insertAdjacentHTML('afterend', '<div class="dhd-error"><p>Sorry, we couldn’t sign you in with that email and password.</p></div>')
        }
      })
      .catch((error) => {
        console.log(error)
      })
  }

  onSignOut () {
    chrome.storage.local.remove('token', () => {
      this.onSelectTab(this.signInForm)
    })
  }

  populate () {
    const setTitle = () => {
      const titleField = this.popover.querySelector('#captured_title_field')
      let title
      if (titleField.value === undefined || titleField.value.length === 0) {
        title = this.title

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
      }
      return title
    }

    const title = setTitle()

    if (this.customFields instanceof Object) {
      const divider = '<div class="divider"></div>'

      if (this.customFields.notes !== undefined) {
        this.popover.querySelector('#captured_note_field').value = this.customFields.notes
        delete this.customFields.notes
      }
      if (this.customFields.page_title !== undefined && this.customFields.page_title === title) {
        delete this.customFields.page_title
      }
      this.renderThumbnails()
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

  // Try to anticipate some common lazy loading issues
  findImageSrc (image) {
    const validSrc = (string) => {
      if (string && string.length) {
        try {
          new URL(string) /* eslint-disable-line no-new */
        } catch (e) {
          return false
        }
        return true
      }
      return false
    }

    let sources = []
    if (image.complete && image.currentSrc) {
      if (/data/i.test(image.getAttribute('src'))) {
        sources.push(image.dataset.largesrc)
        sources.push(image.dataset.src)
        sources = sources.filter(validSrc)
        if (sources.length) {
          return sources[0]
        }
      } else {
        return image.currentSrc
      }
    }
    return false
  }

  renderThumbnails () {
    const previewWrapper = this.popover.querySelector('#thumbnails')
    if (previewWrapper.firstElementChild) return
    if (this.images.length < 1) {
      this.noImages()
      return
    }
    this.appendThumbnailHeader()
    this.images.forEach((image, index) => {
      const src = this.findImageSrc(image.el)
      if (src) {
        previewWrapper.insertAdjacentHTML('beforeend', `
          <input type="radio" form="dhd-save-form" id="image_${index}" name="url" value="${index}">
          <label for="image_${index}"><img src="${src}" alt="" class="thumbnail"></label>
        `)
      }
    })
  }

  closeWithMessage (msg, level) {
    this.popover.innerHTML = `<div class="dhd-message dhd-message--${level}"><p>${msg}</p></div>`
    this.closeOut = window.setTimeout(() => { this.destroy() }, 3000)
  }

  showMessage (msg, level) {
    const container = this.popover.querySelector('.capture-container, .section-container')
    if (container) {
      if (container.firstElementChild && container.firstElementChild.classList.contains('dhd-message')) container.firstElementChild.remove()
      container.insertAdjacentHTML('afterbegin', `
        <div class="dhd-message dhd-message--${level}">
          <button class="dhd-close-button" type="button" id="dhd-close-message">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32">
              <path fill="none" stroke="currentColor" stroke-linecap="square" stroke-width="4" d="M5,5 L27,27 M27,5 L5,27" />
            </svg>
          </button>
          ${msg}
        </div>
      `)
      container.querySelector('#dhd-close-message').addEventListener('click', (event) => {
        this.closeMessage(event)
      }, { once: true })
    }
  }

  toggleSave = (enabled, msg) => {
    const saveBtn = this.popover.querySelector('#save_btn')
    if (saveBtn) {
      saveBtn.disabled = !enabled
      saveBtn.innerHTML = msg || 'Add to Your Dream House Clipboard'
    }
  }
}
