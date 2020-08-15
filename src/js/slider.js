;(function (root, factory) {
    const pluginName = 'flickrGallerySlider';
    if (typeof define === 'function' && define.amd) {
        define([], factory(pluginName));
    } else if (typeof exports === 'object') {
        module.exports = factory(pluginName);
    } else {
        root[pluginName] = factory(pluginName);
    }
}((window || module || {}), function (pluginName) {
    // Use strict mode
    'use strict';

    let defaults = {
        BASEURL: 'https://api.flickr.com/services/rest/?method=',
        apiKey: 'd730e1b0b485148747900002e7da1d08',
        tags: "cats",
        selector: '.flicker-gallery',
        animationSpeed: 250,
        thumb: true,
        navigation: true,
        currentSlide: 1,
        slideNumber: 0,
        preload: {
            range: 2 // number or false to disable
        },
        classToAdd: "fg",
        classToComplete: "fg-ready",
        galleryStructure: {
            galleryListClass: '.fg-list',
            galleryItemClass: '.fg-item',
            galleryImageClass: '.fg-picture',
            navListClass: '.fg-nav-list',
            navItemClass: '.fg-nav-item',
            navImage: '.fg-nav-image'
        },
        galleryNavigation: {
            generate: true, // false to disable
            navListClass: '.fg-nav-list',
            navItemClass: '.fg-nav-item',
            navImage: '.fg-nav-image',
            prevClass: '.fg-prev-btn',
            nextClass: '.fg-next-btn'
        }
    };
    /**
     * Merge defaults with user options
     * @param {Object} target Default settings
     * @param {Object} options User options
     */
    const extend = function (target, options) {
        let prop, extended = {};
        for (prop in defaults) {
            if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
                extended[prop] = defaults[prop];
            }
        }
        for (prop in options) {
            if (Object.prototype.hasOwnProperty.call(options, prop)) {
                extended[prop] = options[prop];
            }
        }
        return extended;
    };

    /**
     * Helper Functions
     * @param {String} baseUrl
     * @param {String} apiKey
     * @param {String} tags
     * @return {String} url
     * @private
     */
    function _galleryUrl(baseUrl, apiKey, tags) {
        return baseUrl
            + 'flickr.photos.search'
            + '&api_key='
            + apiKey
            + '&tags='
            + tags
            + '&format=json'
            + '&nojsoncallback=1';
    }

    /**
     * Image URL docs https://www.flickr.com/services/api/misc.urls.html
     * @param {Object} photo Flickr Image object
     * @param {String} size_suffix: "_b" or "_s" or others supported
     * @return {String} url
     * @private
     */
    function _imageUrl(photo, size_suffix) {
        return "https://farm"
            + photo.farm
            + ".staticflickr.com/"
            + photo.server
            + "/"
            + photo.id
            + "_"
            + photo.secret
            + size_suffix
            + ".jpg";
    }

    /**
     * Get gallery Image list array
     * @param {String} gallery_url
     * @return {Promise} with array of image objects {image:"",thumb:"",title,""}
     * @private
     */
    function _galleryData(gallery_url) {
        return fetch(gallery_url)
            .then(function (response) {
                return response.json();
            })
            .then(function (data) {
                console.log(data);
                let imageList = [];
                for (let i = 0; i < data.photos.photo.length; i++) {
                    imageList.push({
                        image: _imageUrl(data.photos.photo[i], "_b"),
                        thumb: _imageUrl(data.photos.photo[i], "_s"),
                        title: data.photos.photo[i].title
                    });
                }
                return imageList;
            })
            .catch(function () {
                console.log('Network error');
            });
    }

    /**
     * Prepare HTML
     * @param {Element} galleryNode Dom element
     * @param {Array} imageList
     * @param {Boolean} initNavigation
     * @param {Boolean} initThumb
     * @private
     */
    function _prepareInnerHtml(galleryNode, imageList, initNavigation, initThumb) {
        let gallery = '',
            images = '',
            navigation = '',
            thumbs = '';

        // @formatter:off
        for (let i = 0; i < imageList.length; i++) {
            // Image list HTML
            images+= '<li class="fg-galley-item">' +
                        '<img class="fg-picture" src="' + imageList[i].image + '" alt="'+ imageList[i].title + '" loading="lazy" >'+
                     '</li>';

            // Thumbnail list HTML
            if (initThumb === true && initNavigation === true){
                thumbs+= '<li class="fg-nav-item">' +
                            '<img class="fg-nav-image" src="' + imageList[i].thumb + '" alt="'+ imageList[i].title + '" loading="lazy" >'+
                         '</li>';
            }
        }
        thumbs = '<ul class="fg-nav-list">' + thumbs + '</ul>';
        if (initNavigation === true){
            navigation = '<span class="fg-btn-prev"></span>' +
                         '<span class="fg-btn-next"></span>' +
                         '<div class="fg-nav-wrapper">' +
                             thumbs +
                         '</div>';
        }
        gallery = '<div class="fg-galley-wrapper">' +
                      '<ul class="fg-galley-list">' +
                          images +
                      '</ul>' +
                  '</div>' +
                navigation;
        // @formatter:on

        galleryNode.innerHTML = gallery;
    }

    /**
     * Helper to check class name
     * @param {Element} elem Dom Element object
     * @param {String} className
     * @private
     */
    function _hasClass(elem, className) {
        return elem.className.split(' ').indexOf(className) > -1;
    }

    /**
     * Helper to check class name
     * @param {Element} elem Dom Element object
     * @private
     */
    function _slideGallery(elem, destinationSlide) {
        elem.style.left = (destinationSlide * 100) + '%';
        return destinationSlide
    }

    /**
     * Bind Events
     * @param {Element} galleryNode Element object
     * @private
     */
    function _bindEvents(galleryNode) {
        galleryNode.addEventListener('click', function (e) {
            if (_hasClass(e.target, 'fg-btn-prev')) {
                console.log("Previous step");
                galleryNode.querySelector(".fg-galley-list").style.left = '-100%';
            } else if (_hasClass(e.target, 'fg-btn-next')) {
                console.log("Next step");
                galleryNode.querySelector(".fg-galley-list").style.left = '100%';
            }
        }, false);
    }

    /**
     * Prepare gallery
     * @param {Object} options
     * @param {Object} galleryNode
     * @private
     */
    function _prepareGallery(options, galleryNode) {
        // Load data and build HTML
        _galleryData(_galleryUrl(options.BASEURL, options.apiKey, options.tags))
            .then(images => {
                // Decoration class
                galleryNode.classList.add(options.classToAdd);

                options.slideNumber = images.length;
                _prepareInnerHtml(options, galleryNode, images, options.navigation, options.thumb);

                //Complete Decoration class
                galleryNode.classList.add(options.classToComplete);

                //Bind active elements events
                _bindEvents(galleryNode);
            });
    }


    /**
     * Plugin Object
     * @param {Object} options User options
     * @constructor
     */
    function Plugin(options) {
        this.options = extend(defaults, options);
        this.init(); // Initialization Code Here
    }

    /**
     * Plugin prototype
     * @public
     * @constructor
     */
    Plugin.prototype = {
        init: function () {
            // find all matching DOM elements.
            // makes `.selectors` object available to instance.
            this.selectors = document.querySelectorAll(this.options.selector);
            for (let i = 0; i < this.selectors.length; i++) {
                let galleryNode = this.selectors[i];
                _prepareGallery(this.options, galleryNode);
            }
        }, // #! init
        destroy: function () {
            // Remove any event listeners and undo any "init" actions here...
        },
        doSomething: function (someData) {
            console.log(someData);
        } // #! doSomething
    };
    return Plugin;
}));


/**************
 EXAMPLE:
 **************/

//// create new Plugin instance
// let flickrGallery = new flickrGallerySlider({
//     selector: ".my-gallery",
//     apiKey: "d730e1b0b485148747900002e7da1d08",
//     tags: 'dogs'
// })

//// access public plugin methods
// flickrGallery.publicMethod("Doing Something")
