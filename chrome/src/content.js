/* global $, Image, TinyTFIDF, chrome */
const MOUSE_VISITED_CLASSNAME = 'crx_mouse_visited'
let prevDOM = null
let selectingDOM = false
let selectedElements = []
let hasStoragePermission = false

// function isElementVisible(el) {
//   const o = new IntersectionObserver(([entry]) => {
//     return entry.intersectionRatio === 1;
//   });
//   o.observe(el)
// }

const getTopTermsInDoc = () => {
  const corpus = new TinyTFIDF.Corpus(['doc1'], [$('body').text()])
  return corpus.getTopTermsForDocument('doc1').slice(0, 15)
}

const clearSelection = () => {
  unstyleSelectedElements()

  selectedElements = []
  $(document).unbind('mousemove')
}

const unstyleSelectedElements = () => {
  if (selectedElements.length > 0) {
    selectedElements.forEach(el => {
      // console.log('el in selectedElements', el)
      el.classList.remove(MOUSE_VISITED_CLASSNAME)
    })
  }
}

const imageToDataURL = (src, callback, outputFormat) => {
  const img = new Image()
  img.crossOrigin = 'Anonymous'
  img.onload = (event) => {
    const loadedImage = event.currentTarget
    const canvas = document.createElement('CANVAS')
    const ctx = canvas.getContext('2d')
    let dataURL = ''
    canvas.height = loadedImage.naturalHeight
    canvas.width = loadedImage.naturalWidth
    ctx.drawImage(loadedImage, 0, 0)
    dataURL = canvas.toDataURL(outputFormat)
    callback(dataURL)
  }
  img.src = src
  if (img.complete || img.complete === undefined) {
    img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw=='
    img.src = src
  }
}

// Extract selected fields for Slack
const slackFields = () => {
  const messages = selectedElements.map(el => {
    let selector = $(el)
    if (!el.classList.contains('c-virtual_list__item') && !el.classList.contains('c-message_kit__gutter')) {
      selector = $(el).closest('.c-virtual_list__item')
    }

    if (selector.length === 0) return null

    const sender = selector.find('.c-message__sender').text()
    const link = selector.find('a.c-link.c-timestamp')[0].href
    const text = selector.find('.p-rich_text_block').text()

    return ({
      sender_name: sender,
      message_link: link,
      message_text: text
    })
  })

  return { messages: messages.filter((m) => m) }
}

const redditSelectedFields = () => {
  const comments = selectedElements.map(el => {
    const comment = {}

    const commentBody = $(el).find('div[data-test-id="comment"]')
    if (commentBody.length === 0) return null
    comment.body = commentBody.text()

    const timestamp = $(el).find('[id^=CommentTopMeta--Created--]')
    if (timestamp.length > 0) {
      comment.url = timestamp[0].href
    }

    return comment
  })

  return { comments: comments.filter(c => c) }
}

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
  const pathname = window.location.pathname.split('/').filter((segment) => segment.length > 0)
  if (pathname.length >= 3) {
    const activeSlide = document.querySelector('.afd-gal-figure:not(.afd-hide)')
    if (activeSlide) {
      copyright = document.querySelector('.afd-gal-figcaption__link')
      url = activeSlide.querySelector('img').dataset.largesrc
    }
    description = description === null ? '' : description.textContent.trim()
  } else {
    copyright = document.querySelector('.featured-image figcaption')
    url = document.querySelector('.featured-image img').src
  }
  const specItems = document.querySelectorAll('.afd-specs__item')
  const topics = []
  for (const item of specItems) {
    const key = item.querySelector('.afd-specs__key')
    const value = item.querySelector('.afd-specs__value')
    if (key && value) {
      topics.push({ topic: key.textContent.trim().replace(/:.*$/, ''), value: value.textContent.trim() })
    }
  }

  if (copyright) {
    copyright = copyright.textContent
    const copyrightPattern = new RegExp('(©)(.*)', 'i')
    const copyrightMatch = copyrightPattern.exec(copyright)
    if (copyrightMatch && copyrightMatch.length >= 2) {
      copyright = copyrightPattern.exec(copyright.textContent)[2]
    }
    topics.push({ topic: 'Copyright Holder', value: copyright })
  }
  topics.push({ topic: 'ArchDaily URL', value: window.location.href })

  return ({
    notes: description,
    topics: topics,
    url: url
  })
}

const pinterestPinFields = () => {
  let description = document.querySelector('.richPinInformation span')
  if (description) description = description.textContent
  let image = null
  let imageURL = document.querySelector('div[data-test-id="closeup-image"] img + div img')
  if (imageURL) {
    imageURL = imageURL.src
    // This is currently useless
    imageToDataURL(imageURL, (dataURL) => {
      image = new Image()
      image.src = dataURL
    })
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

const isSlackPage = () => {
  return window.location.href.startsWith('https://app.slack.com/client/')
}

const isRedditPage = () => {
  return window.location.href.includes('reddit.com/r/') && window.location.href.includes('comments')
}

const isEdxLecturePage = () => {
  return window.location.href.startsWith('https://courses.edx.org/courses/') && window.location.href.includes('courseware')
}

const isArchDailyPage = () => {
  return /archdaily.com$/.text(window.location.hostname) && /^\/\d+\//.test(window.location.pathname)
}

const isPinterestPage = () => {
  return /pinterest.com$/.test(window.location.hostname) && /^\/pin\//.test(window.location.pathname)
}

const parseSelectedElements = () => {
  if (isSlackPage()) {
    return slackFields()
  }

  if (isRedditPage()) {
    return redditSelectedFields()
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

    if (request.hasStoragePermission === true) {
      hasStoragePermission = true
      sendResponse({ ack: true })
    }

    if (request.clearSelection === true) {
      clearSelection()
      sendResponse({ ack: true })
    }

    if (request.message === 'clicked_browser_action') {
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

      // Index the DOM
      getTopTermsInDoc()

      // Youtube video
      if (isYoutubeVideoPage()) {
        const fields = youtubeFields()
        Object.assign(customFields, fields)

        // TODO - replace an existing t parameter
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
      if (isArchDailyPage) {
        Object.assign(customFields, archDailyFields())
        titleOverride = document.querySelector('h1').textContent || null
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

      if (selectedElements.length > 0) {
        const selectedFields = parseSelectedElements()

        customFields = {
          ...customFields,
          ...selectedFields
        }
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

    if (request.addSelection) {
      selectingDOM = true

      console.log('in addSelection in content script')
      sendResponse({ ack: true })

      $(document).mousemove(function (e) {
        var target = e.target

        // console.log('target', target)
        const whiteListedNodes = ['DIV', 'IMG', 'A', 'P', 'SPAN', 'H1', 'H2', 'H3', 'H4', 'H5']

        // if (whiteListedClasses && target.class)
        // TODO - perhaps we should restrict what elements can be added?
        // do it by source

        if (whiteListedNodes.includes(target.nodeName)) {
          // For NPE checking, we check safely. We need to remove the class name
          // Since we will be styling the new one after.
          if (prevDOM != null && !selectedElements.includes(prevDOM)) {
            prevDOM.classList.remove(MOUSE_VISITED_CLASSNAME)
          }
          // Add a visited class name to the element. So we can style it.
          target.classList.add(MOUSE_VISITED_CLASSNAME)
          // The current element is now the previous. So we can remove the class
          // during the next iteration.
          prevDOM = target
        }
      })
    }

    if (request.cancelSelection) {
      selectingDOM = false
      $(document).unbind('mousemove')
    }
  }
)

$(function () {
  document.addEventListener('click', (e) => {
    if (selectingDOM) {
      if (hasStoragePermission) {
        const element = e.target

        if (selectedElements && selectedElements.includes(element.outerHTML)) return

        selectedElements.push(element)
      }
    }
  })
})
