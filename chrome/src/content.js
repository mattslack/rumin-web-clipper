/* global FormData, chrome, fetch */

// function isElementVisible(el) {
//   const o = new IntersectionObserver(([entry]) => {
//     return entry.intersectionRatio === 1;
//   });
//   o.observe(el)
// }

// parse '(hh):mm:ss' string into seconds
const timeStringToSeconds = (str) => {
  return str.split(':').reverse().reduce((prev, curr, i) => prev + curr * Math.pow(60, i), 0)
}

const youtubeFields = () => {
  const currentTime = document.querySelector('.ytp-time-current').textContent
  const channelName = document.querySelector('.ytd-channel-name yt-formatted-string').textContent
  const channelUrl = document.querySelector('.ytd-channel-name yt-formatted-string a').href
  const publishedDate = document.querySelector('#date yt-formatted-string.ytd-video-primary-info-renderer').textContent.replace('Premiered ', '') // FIXME - this can break for other languages

  return ({
    current_time: currentTime,
    channel_name: channelName,
    channel_url: channelUrl,
    published_date: publishedDate
  })
}

const linkedinLearningFields = () => {
  const classTitle = document.querySelector('.classroom-nav__details h1').textContent
  const currentTime = document.querySelector('.vjs-current-time').textContent
  const teacherName = document.querySelector('.authors-entity__name-text').textContent.trim().split('\n')[0]
  const teacherUrl = document.querySelector('a.course-author-entity__lockup').getAttribute('href')
  const sessionTitle = document.querySelector('.classroom-toc-item--selected').textContent
  const sessionTranscript = document.querySelector('.transcripts-component__sections').textContent.trim()

  return ({
    class_title: classTitle.trim(),
    current_time: currentTime,
    teacher_name: teacherName.trim(),
    teacher_url: teacherUrl,
    session_title: sessionTitle.trim(),
    session_transcript: sessionTranscript
  })
}

const skillShareFields = () => {
  const classTitle = document.querySelector('.class-details-header-name').textContent
  const currentTime = document.querySelector('.vjs-current-time-display').textContent
  const teacherName = document.querySelector('.class-details-header-teacher-link').textContent
  const teacherUrl = document.querySelector('.class-details-header-teacher-link').getAttribute('href')
  const sessionTitle = document.querySelector('.session-item.active .session-item-title').textContent

  return ({
    class_title: classTitle.trim(),
    current_time: currentTime,
    teacher_name: teacherName.trim(),
    teacher_url: teacherUrl,
    session_title: sessionTitle.trim()
  })
}

const netflixFields = () => {
  const videoTitle = document.querySelector('.video-title h4').textContent
  const episodeTitle = document.querySelector('.video-title span').textContent
  const currentTime = document.querySelector('.scrubber-head').getAttribute('aria-valuetext')

  return ({
    video_title: videoTitle,
    episode_title: episodeTitle,
    current_time: currentTime
  })
}

const edxLectureFields = () => {
  const provider = document.querySelector('.course-header .provider').textContent
  const courseCode = document.querySelector('.course-header .course-number').textContent
  const courseName = document.querySelector('.course-header .course-name').textContent

  let videoUrl = document.querySelectorAll('.video-sources')
  videoUrl = videoUrl.length > 0 ? videoUrl[0].href : null

  let slidesUrl = document.querySelectorAll('a[href$=pdf]')
  slidesUrl = slidesUrl.length > 0 ? slidesUrl[0].href : null

  let vidTime = document.querySelectorAll('.vidtime')
  vidTime = vidTime.length > 0 ? vidTime.textContent.split('/')[0].trim() : null

  return ({
    course_provider: provider,
    course_code: courseCode,
    course_name: courseName,
    video_url: videoUrl,
    slides_url: slidesUrl,
    current_time: vidTime
  })
}

const archDailyFields = () => {
  let copyright
  let description = document.querySelector('.afd-gal-description')
  let url
  const pathname = window.location.pathname.replace(/^\//, '').split('/').filter((segment, index) => {
    if (index === 0) return segment.length > 2
    return segment.length > 0
  })
  const specItems = document.querySelectorAll('.afd-specs__item')
  const topics = []

  for (const item of specItems) {
    const key = item.querySelector('.afd-specs__key')
    const value = item.querySelector('.afd-specs__value')
    if (key && value) {
      topics.push({ topic: key.textContent.trim().replace(/:.*$/, ''), value: value.textContent.trim() })
    }
  }

  if (pathname.length >= 3) { // You're in a photo gallery
    const activeSlide = document.querySelector('.afd-gal-figure:not(.afd-hide)')
    if (activeSlide) {
      copyright = document.querySelector('.afd-gal-figcaption__link')
      url = activeSlide.querySelector('img').dataset.largesrc
    }
    description = description === null ? '' : description.textContent.trim()
    const articleURL = document.querySelector('a.afd-gal-close')
    if (articleURL) {
      topics.push({ topic: 'ArchDaily URL', value: articleURL.href })
    }
  } else { // You're on an article page
    const img = document.querySelector('.featured-image, .media-picture')
    if (img) {
      copyright = img.querySelector('figcaption')
      url = img.querySelector('img').src
    }
    topics.push({ topic: 'ArchDaily URL', value: window.location.href })
  }

  if (copyright) {
    copyright = copyright.textContent
    const copyrightPattern = new RegExp('(©)(.*)', 'i')
    const copyrightMatch = copyrightPattern.exec(copyright)
    if (copyrightMatch && copyrightMatch.length >= 2) {
      copyright = copyrightMatch[2]
    }
    topics.push({ topic: 'Copyright Holder', value: copyright })
  }

  return ({
    notes: description,
    topics: topics,
    url: url
  })
}

const houzzFields = () => {
  const topics = []
  let notes = null
  let url = null
  let image = document.querySelector('img.view-photo-image-pane__image')
  const description = document.querySelector('.hz-view-photo__space-info__description') || document.querySelector('.vp-redesign-description')
  if (description) {
    notes = description.textContent
  }
  if (image) {
    url = image.src
  } else {
    image = document.querySelector('.hz-page-content-wrapper--viewProduct img.zoom-pane-image')
    if (image && image.style.getPropertyValue('background-image')) {
      url = image.style.getPropertyValue('background-image').replace(/^url\("/, '').replace(/"\)$/, '')
    }
  }
  const productSpecs = document.querySelectorAll('dl .product-spec-item')
  for (const spec of productSpecs) {
    const key = spec.querySelector('dt')
    const value = spec.querySelector('dd')
    if (key && value) {
      topics.push({ topic: key.textContent.trim(), value: value.textContent.trim() })
    }
  }
  topics.push({ topic: 'Houzz URL', value: window.location.href })
  return ({
    notes: notes,
    topics: topics,
    url: url
  })
}

const pinterestPinFields = () => {
  let description = document.querySelector('.richPinInformation span')
  if (description) description = description.textContent
  let imageURL = document.querySelector('div[data-test-id="closeup-image"] img + div img')
  if (imageURL) {
    imageURL = imageURL.src
  }
  let pinnedBy = document.querySelector('.pinActivityContainer svg title, .pinActivityContainer img')
  if (pinnedBy) {
    pinnedBy = pinnedBy.alt || pinnedBy.textContent
  }
  let pinnedFrom = document.querySelector('a.linkModuleActionButton')
  if (pinnedFrom) pinnedFrom = pinnedFrom.href
  return ({
    notes: description,
    url: imageURL,
    topics: [
      { topic: 'Pin URL', value: window.location.href },
      { topic: 'Pinned By', value: pinnedBy },
      { topic: 'Pin Source URL', value: pinnedFrom }
    ]
  })
}

const isLinkedinLearningPage = () => {
  return window.location.href.startsWith('https://www.linkedin.com/learning/') && document.querySelectorAll('.classroom-layout__content').length > 0
}

const isSkillshareVideoPage = () => {
  return window.location.href.startsWith('https://www.skillshare.com/classes/')
}

const isNetflixVideoPage = () => {
  return window.location.href.startsWith('https://www.netflix.com/watch/')
}

const isYoutubeVideoPage = () => {
  return window.location.href.startsWith('https://www.youtube.com/watch?v=')
}

const isKindleCloudReaderPage = () => {
  return window.location.href.startsWith('https://read.amazon.com') && !window.location.href.includes('notebook')
}

const isKindleNotebookPage = () => {
  return window.location.href.startsWith('https://read.amazon.com/notebook')
}

const isEdxLecturePage = () => {
  return window.location.href.startsWith('https://courses.edx.org/courses/') && window.location.href.includes('courseware')
}

const isArchDailyPage = () => {
  return /archdaily.com(\.(br|cl|mx|cn))?$/.test(window.location.hostname) && /^\/((br|cl|mx|cn)\/)?\d+\//.test(window.location.pathname)
}

const isHouzzPage = () => {
  return /houzz.com$/.test(window.location.hostname)
}

const isPinterestPage = () => {
  return /pinterest.com$/.test(window.location.hostname) && /^\/pin\//.test(window.location.pathname)
}

const processPage = (customFields) => {
  let titleOverride = null
  let urlOverride = null
  // Youtube video
  if (isYoutubeVideoPage()) {
    const fields = youtubeFields()
    Object.assign(customFields, fields)

    // TODO - replace an existing parameter
    if (window.location.search.includes('t=')) {
      urlOverride = `${window.location.origin}${window.location.pathname}${window.location.search.replace(/t=[0-9]+s/, 't=' + timeStringToSeconds(fields.current_time) + 's')}`
    } else {
      urlOverride = `${window.location.href}&t=${timeStringToSeconds(fields.current_time)}`
    }
  }

  // Netflix Video
  if (isNetflixVideoPage()) {
    const fields = netflixFields()
    Object.assign(customFields, fields)
  }

  // Skillshare video
  if (isSkillshareVideoPage()) {
    const fields = skillShareFields()
    Object.assign(customFields, fields)
  }

  // Linkedin Learning
  if (isLinkedinLearningPage()) {
    const fields = linkedinLearningFields()
    Object.assign(customFields, fields)
  }

  // Kindle Cloud reader
  if (isKindleCloudReaderPage()) {
  }

  // Arch Daily
  if (isArchDailyPage()) {
    Object.assign(customFields, archDailyFields())
    titleOverride = document.querySelector('h1').textContent || null
  }

  // Houzz Page
  if (isHouzzPage()) {
    Object.assign(customFields, houzzFields())
    titleOverride = document.title || null
  }

  // Pinterest Pin
  if (isPinterestPage()) {
    Object.assign(customFields, pinterestPinFields())
    titleOverride = document.querySelector('h1').textContent || null
  }

  // Page title
  const h1 = document.querySelectorAll('h1')
  if (h1.length > 0) {
    customFields.page_title = h1[0].textContent.trim()
  }

  // edX
  if (isEdxLecturePage()) {
    Object.assign(customFields, edxLectureFields())
  }

  // if (isMedium)
  // Kindle Notes and Highlights: https://read.amazon.com/notebook
  // Go to the first book
  // $('.kp-notebook-library-each-book a.a-link-normal')[0].click()
  // document in the first kindle iframe
  // $('#KindleReaderIFrame').get(0).contentDocument
  if (isKindleNotebookPage()) {
    console.log('is kindle notebook page!')

    titleOverride = document.querySelector('h3').textContent
    customFields.page_title = titleOverride
    customFields.book_title = titleOverride
    customFields.book_author = document.querySelectorAll('p.kp-notebook-metadata')[1].textContent
  }
  return {
    customFields: customFields,
    titleOverride: titleOverride,
    urlOverride: urlOverride
  }
}

const buildPopover = () => {
  const popover = document.createElement('div')
  popover.setAttribute('id', 'dhd-popover')

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
  return popover
}

class DreamHouseModal {
  constructor (popover) {
    this.apiHost = 'https://api.dreamhousedesign.com'
    this.pageUrl = null
    this.popover = popover
    this.title = null

    /*
    popover.querySelector('#save_btn').addEventListener('click', this._onSave)
    popover.querySelector('#sign-in-form').addEventListener('submit', this._onSignIn)

    this.signInTabBtn = popover.querySelector('#lookup_tab_btn')
    this.saveTabBtn = popover.querySelector('#save_tab_btn')

    if (readCookie('access_token') === null) {
      this._selectTab({ target: this.signInTabBtn })
      this.saveTabBtn.disabled = true
    }
    */
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

    return params
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

  renderPreview (src) {
    const previewWrapper = document.querySelector('#thumbnail')
    while (previewWrapper.firstElementChild) {
      previewWrapper.firstElementChild.remove()
    }
    previewWrapper.insertAdjacentHTML('afterbegin', `<img src="${src}" alt="" class="thumbnail">`)
  }

  updateContent (pageContext) {
    const titleField = this.popover.querySelector('#captured_title_field')
    if (!this.title || (this.title && this.title.trim() === '')) {
      this.title = pageContext.titleOverride ? pageContext.titleOverride : document.title
      this.title = this.title.slice(0, 300)
    }

    this.pageUrl = pageContext.urlOverride ? pageContext.urlOverride : window.location.url
    const customFields = pageContext.customFields

    if (this.title.trim() !== '') {
      titleField.value = this.title.trim()
    } else {
      titleField.value = this.pageUrl
    }

    if (Object.keys(customFields).length > 0) {
      this.popover.querySelector('#custom_fields_section').classList.remove('hidden')

      const divider = '<div class="divider"></div>'

      if (customFields.notes !== undefined) {
        this.popover.querySelector('#captured_note_field').value = customFields.notes
        delete this.customFields.notes
      }

      if (customFields.page_title !== undefined && customFields.page_title === this.title) {
        delete this.customFields.page_title
      }

      if (customFields.url !== undefined) {
        this.renderPreview(this.customFields.url)
        this.popover.querySelector('#save_btn').disabled = false
      }

      const customFieldElements = Object.keys(customFields).map(fieldName => {
        return this.buildCustomField(fieldName, customFields[fieldName])
      }).join(divider)

      this.popover.querySelector('#custom_fields').innerHTML = `
        <div>
          ${customFieldElements}
        </div>`
    }
  }

  _onSave (event) {
    const popover = event.currentTarget.closest('#dhd-popover')
    const saveButton = event.currentTarget
    // disable button
    saveButton.innerHTML('<div style="width: 100%; text-align: center"><img src="images/spinner.webp" width="32" height="32" style="margin: auto; display: block" /><p><small>Saving...Do not close this</small></p></div>')
    saveButton.setAttribute('class', '')

    const url = `${this.apiHost}/api/clipboard`
    const data = this.activityData

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

  _onSignIn (event) {
    event.preventDefault()
    const fd = new FormData(event.currentTarget)
    fetch(event.currentTarget.getAttribute('action'), {
      method: 'POST',
      body: fd
    })
      .then((res) => {
        res.json().then(json => {
          document.cookie = `access_token=${json.access_token};`
          this.saveTabBtn.disabled = false
          this._selectTab({ target: this.saveTabBtn })
        })
      })
      .catch((error) => {
        console.log(error)
      })
  }

  _selectTab (event) {
    const popover = event.currentTarbet.closest('#dhd-popover')
    if (event.target.classList.contains('tab')) {
      if (event.type) event.stopImmediatePropagation()
      const tabs = Array.from(popover.querySelectorAll('.tab'))
      tabs.forEach((tab) => {
        tab.classList.toggle('active', tab === event.target)
        popover.querySelector(`#${tab.dataset.content}`).classList.toggle('hidden', tab !== event.target)
      })
    }
  }
}

const readCookie = (name) => {
  const nameEQ = name + '='
  const ca = document.cookie.split(';')
  for (var c of ca) {
    while (c.charAt(0) === ' ') c.substring(1, c.length)
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
  }
  return null
}

const saveToDreamHouse = (request) => {
  let titleOverride = null
  let urlOverride = null
  let customFields = {}

  const processedPage = processPage(customFields)
  customFields = processedPage.customFields
  titleOverride = processedPage.titleOverride
  urlOverride = processedPage.urlOverride || null

  Object.assign(customFields, { url: request.info.srcUrl })

  const pageContext = {
    urlOverride: urlOverride,
    titleOverride: titleOverride,
    // closestId: closestId,
    // page_dom: document.documentElement.outerHTML,
    customFields: customFields
  }

  const backdrop = document.createElement('div')
  backdrop.setAttribute('id', 'dhd-backdrop')
  const popover = buildPopover()
  const modal = new DreamHouseModal(popover)
  backdrop.appendChild(popover)
  document.body.appendChild(backdrop)
  modal.updateContent(pageContext)
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    // if (request.disconnect === true) {
    //   if (hasStoragePermission) {
    //     chrome.storage.local.clear()
    //     chrome.storage.local.remove('selectedElements')
    //   }
    // }

    if (request.message === 'save_to_dream_house') {
      saveToDreamHouse(request)
    }
  }
)
