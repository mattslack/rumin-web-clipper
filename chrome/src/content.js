/* global $, chrome */

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
  const currentTime = $('.ytp-time-current')[0].innerText
  const channelName = $('.ytd-channel-name yt-formatted-string')[0].innerText
  const channelUrl = $('.ytd-channel-name yt-formatted-string a')[0].href
  const publishedDate = $('#date yt-formatted-string.ytd-video-primary-info-renderer')[0].innerText.replace('Premiered ', '') // FIXME - this can break for other languages

  return ({
    current_time: currentTime,
    channel_name: channelName,
    channel_url: channelUrl,
    published_date: publishedDate
  })
}

const linkedinLearningFields = () => {
  const classTitle = $('.classroom-nav__details h1').text()
  const currentTime = $('.vjs-current-time').text()
  const teacherName = $('.authors-entity__name-text').text().trim().split('\n')[0]
  const teacherUrl = $('a.course-author-entity__lockup').attr('href')
  const sessionTitle = $('.classroom-toc-item--selected').text()
  const sessionTranscript = $('.transcripts-component__sections').text().trim()

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
  const classTitle = $('.class-details-header-name').text()
  const currentTime = $('.vjs-current-time-display').text()
  const teacherName = $('.class-details-header-teacher-link').text()
  const teacherUrl = $('.class-details-header-teacher-link').attr('href')
  const sessionTitle = $('.session-item.active .session-item-title').text()

  return ({
    class_title: classTitle.trim(),
    current_time: currentTime,
    teacher_name: teacherName.trim(),
    teacher_url: teacherUrl,
    session_title: sessionTitle.trim()
  })
}

const netflixFields = () => {
  const videoTitle = $('.video-title h4').text()
  const episodeTitle = $('.video-title span').text()
  const currentTime = $('.scrubber-head').attr('aria-valuetext')

  return ({
    video_title: videoTitle,
    episode_title: episodeTitle,
    current_time: currentTime
  })
}

const edxLectureFields = () => {
  const provider = $('.course-header .provider').text()
  const courseCode = $('.course-header .course-number').text()
  const courseName = $('.course-header .course-name').text()

  const videoUrl = $('.video-sources').length > 0 ? $('.video-sources').get(0).href : null
  const slidesUrl = $('a[href$=pdf]').length > 0 ? $('a[href$=pdf]').get(0).href : null

  const vidTime = $('.vidtime').length > 0 ? $('.vidtime').text().split('/')[0].trim() : null

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
  return window.location.href.startsWith('https://www.linkedin.com/learning/') && $('.classroom-layout__content').length > 0
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

const processPage = (customFields, sel) => {
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
  if ($('h1').length > 0) {
    customFields.page_title = $('h1')[0].textContent.trim()
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

    titleOverride = $('h3').text()
    customFields.page_title = $('h3').text()
    customFields.book_title = $('h3').text()
    customFields.book_author = $('p.kp-notebook-metadata')[1].innerText

    let currRow

    if (sel && sel.rangeCount > 0) {
      const selectionEl = sel.getRangeAt(0).startContainer.parentNode

      if (selectionEl.classList.contains('a-row')) {
        currRow = selectionEl
        // closestId = selectionEl.id
      } else {
        const prevSibling = $(selectionEl).prev('.a-row')
        const prevParent = $(selectionEl).closest('.a-row')

        if (prevSibling.length > 0) {
          // closestId = prevSibling[0].id
          currRow = prevSibling
        } else if (prevParent.length > 0) {
          // closestId = prevParent[0].id
          currRow = prevParent
        }
      }

      console.log('currRow', currRow)
      const prevRow = $(selectionEl).closest('.kp-notebook-row-separator')
      console.log('prevRow', prevRow)

      customFields.book_location = prevRow.find('#annotationHighlightHeader')[0].innerText
    }
  }
  return {
    customFields: customFields,
    titleOverride: titleOverride,
    urlOverride: urlOverride
  }
}

chrome.runtime.onMessage.addListener(
  function (request, sender, sendResponse) {
    // console.log(request.message);

    // if (request.disconnect === true) {
    //   if (hasStoragePermission) {
    //     chrome.storage.local.clear()
    //     chrome.storage.local.remove('selectedElements')
    //   }
    // }

    if (request.message === 'save_to_dream_house' || request.message === 'clicked_browser_action') {
      const sel = window.getSelection()
      const selectionText = sel.toString()

      // console.log('selectionText', selectionText)

      let titleOverride = null
      let urlOverride = null
      let customFields = {}
      let closestId = ''

      if (sel && sel.rangeCount > 0) {
        const selectionEl = sel.getRangeAt(0).startContainer.parentNode

        if (selectionEl.id) {
          closestId = selectionEl.id
        } else {
          const prevSibling = $(selectionEl).prev('[id]')
          const prevParent = $(selectionEl).closest('[id]')

          if (prevSibling.length > 0) {
            closestId = prevSibling[0].id
          } else if (prevParent.length > 0) {
            closestId = prevParent[0].id
          }
        }

        if (closestId) {
          urlOverride = `${window.location.href}#${closestId}`
        }
      }

      const processedPage = processPage(customFields, sel)
      customFields = processedPage.customFields
      titleOverride = processedPage.titleOverride
      urlOverride = processedPage.urlOverride || null

      if (request.message === 'save_to_dream_house') {
        Object.assign(customFields, { url: request.info.srcUrl })
      }

      const pageContext = {
        pageContext: {
          urlOverride: urlOverride,
          titleOverride: titleOverride,
          selection: selectionText,
          // closestId: closestId,
          // page_dom: document.documentElement.outerHTML,
          customFields: customFields
        }
      }

      // console.log('sending pageContext', pageContext, window.getSelection().toString())

      chrome.runtime.sendMessage(pageContext, function (response) {
      })
    }
  }
)
