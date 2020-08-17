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
        baseUrl: 'https://api.flickr.com/services/rest/?method=',
        apiKey: 'd730e1b0b485148747900002e7da1d08',
        tags: "cats",
        gallerySelector: '.flicker-gallery',
        animationSpeed: 250,
        thumb: true,
        navigation: true,
        perPage: 15,
        slideNumber: 0,
        preload: {
            range: 5 // number or false to disable
        },
        classToAdd: "fg",
        classToComplete: "fg-ready",
        selectors: {
            galleryList: 'fg-galley-list',
            galleryItem: 'fg-galley-item',
            active: 'fg-active',
            galleryPreviousItem: 'fg-item-prev',
            galleryNextItem: 'fg-item-next',
            collapsedItem: 'fg-collapsed',
            galleryImage: 'fg-picture',
            navListClass: 'fg-nav-list',
            navItemClass: 'fg-nav-item',
            navActiveItem: 'fg-nav-item-active',
            navImage: 'fg-nav-image',
            prevBtn: 'fg-btn-prev',
            nextBtn: 'fg-btn-next',
            btnDisabled: 'fg-btn-disabled'
        }
    };


    let gallery = function () {
        return {
            state: {
                currentSlide: 1,
                slidesNumber: 0,
                galleryNode: null,
                galleryListNode: null,
                navigationListNode: null,
                navigationNodes:[],
                page: 1
            },
            /**
             * Image URL docs https://www.flickr.com/services/api/misc.urls.html
             * @param {Object} photo Flickr Image object
             * @param {String} size_suffix: "_b" or "_s" or others supported
             * @return {String} url
             */
            _imageUrl: function (photo, size_suffix) {
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
            },

            /**
             * Generate gallery Url
             * @param {String} tags
             * @return {String} url
             */
            _galleryUrl: function (tags) {
                return this.options.baseUrl
                    + 'flickr.photos.search'
                    + '&api_key='
                    + this.options.apiKey
                    + '&tags='
                    + tags
                    + '&per_page='
                    + this.options.perPage
                    + '&page='
                    + this.state.page
                    + '&format=json'
                    + '&nojsoncallback=1';
            },

            /**
             * Get gallery Image list array
             * @param {String} gallery_url
             * @return {Promise} with array of image objects {image:"",thumb:"",title,""}
             */

            _galleryData: function (gallery_url) {
                let self = this;
                return fetch(gallery_url)
                    .then(function (response) {
                        return response.json();
                    })
                    .then(function (data) {
                        console.log(data);
                        let imageList = [];
                        for (let i = 0; i < data.photos.photo.length; i++) {
                            imageList.push({
                                image: self._imageUrl(data.photos.photo[i], "_b"),
                                thumb: self._imageUrl(data.photos.photo[i], "_s"),
                                title: data.photos.photo[i].title
                            });
                        }
                        return imageList;
                    })
                    .catch(function (e) {
                        console.log('Network error' + e);
                    });
            },

            /**
             * Prepare Gallery and Navigation images
             * @param {Array} imageList
             */

            _addImages(imageList) {
                let images = '',
                    thumbs = '',
                    imagesElements = document.createElement('template'),
                    tumbsElements = document.createElement('template'),
                    lazyLoad = 'loading="lazy"',
                    extraClass = 'fg-collapsed';

                for (let i = 0; i < imageList.length; i++) {
                    if (this.state.page === 1) {
                        switch (i) {
                            case 0:
                                // First visible frame
                                extraClass = 'fg-active';
                                lazyLoad = '';
                                break;
                            case 1:
                                // Next prepared frame
                                extraClass = 'fg-item-next';
                                lazyLoad = '';
                                break;
                            default:
                                extraClass = 'fg-collapsed';
                                lazyLoad = 'loading="lazy"';
                        }
                    }
                    // @formatter:off
                    // Image list HTML
                    images+= '<li class="fg-galley-item ' + extraClass +'" data-tile ="'+ imageList[i].title +'">' +
                                '<img class="fg-picture" src="' + imageList[i].image + '" alt="'+ imageList[i].title + '"' + lazyLoad + '>'+
                            '</li>';

                    // Thumbnail list HTML
                    if ( this.options.thumb === true){
                        if(this.state.page !== 1 || i !==0) {
                            extraClass ='';
                        } else {
                            extraClass ='fg-active';
                        }

                        thumbs+= '<li class="fg-nav-item '+ extraClass +'">' +
                                    '<img class="fg-nav-image" src="' + imageList[i].thumb + '" alt="'+ imageList[i].title + '" >'+
                                 '</li>';
                    }
                    // @formatter:on
                }

                // Append images on the page
                imagesElements.innerHTML = images;
                tumbsElements.innerHTML = thumbs;
                this.state.galleryListNode.appendChild(imagesElements.content);
                this.state.navigationListNode.appendChild(tumbsElements.content);

                // Update State
                this.state.slidesNumber += imageList.length;
                this.state.navigationNodes = this.state.navigationListNode.querySelectorAll('.'+ this.options.selectors.navItemClass);
            },
            /**
             * Prepare HTML
             * @param {Array} imageList
             */
            _prepareInnerHtml: function (galleryNode, imageList) {
                // @formatter:off
                let gallery = '',
                    navigation = '';

                if ( this.options.navigation === true){
                    navigation = '<div class="fg-nav-wrapper">' +
                                    '<ul class="fg-nav-list"></ul>';
                                '</div>';
                }

                gallery = '<div class="fg-galley-wrapper">' +
                                '<ul class="fg-galley-list">' +
                                    '<li class="fg-galley-item fg-item-prev fg-blanc"></li>' +
                                '</ul>' +
                            '</div>' +
                            '<span class="fg-btn-prev"></span>' +
                            '<span class="fg-btn-next"></span>' +
                            '<div class="fg-nav-wrapper">' +
                                navigation +
                            '</div>';
                // @formatter:on
                galleryNode.innerHTML = gallery;
            },

            /**
             * Align navigation
             * @param {Number} destinationSlide
             */
            _alignNaviagtion: function (destinationSlide) {
                let navigationGallery = this.state.galleryNode.querySelector('.' + 'fg-nav-list'),
                    wrapperW = this.state.galleryNode.querySelector('.' + 'fg-nav-wrapper').offsetWidth,
                    galleryW = navigationGallery.offsetWidth,
                    slideNumber = this.state.slidesNumber,
                    slideW = galleryW / slideNumber,
                    destinationCenter = destinationSlide * slideW + slideW / 2,
                    position = 0;

                // Slide navigation. Better to move in separate method to call on windows resize
                if (wrapperW / 2 < destinationCenter && galleryW - destinationCenter > wrapperW / 2) {
                    position = -(destinationCenter - wrapperW / 2);
                    navigationGallery.style.left = position + "px";
                } else if (galleryW - destinationCenter < wrapperW / 2){
                    position = -(galleryW - wrapperW);
                    navigationGallery.style.left = position + "px";
                }
            },

            /**
             * Animate thumb list movement, done for position change
             * @param {Number} destinationSlide
             */
            _slideThumbs: function (destinationSlide) {
                let navigationGallery = this.state.galleryNode.querySelector('.' + 'fg-nav-list'),
                    navNodes = Array.prototype.slice.call(navigationGallery.children);

                navNodes[this.state.currentSlide - 1].removeClass("fg-active");
                navNodes[destinationSlide].addClass("fg-active");
                this._alignNaviagtion(destinationSlide);
            },

            /**
             * Animate gallery list movement
             * @param {Element} galleryNode Dom Element object
             * @param {Number} destinationSlide
             */
            _slideGallery: function (galleryNode, destinationSlide) {
                let selector = this.options.selectors,
                    galleryList = galleryNode.querySelectorAll("." + selector.galleryItem),
                    oldPrevious = galleryList[this.state.currentSlide - 1],
                    oldNext = galleryList[this.state.currentSlide + 1],
                    oldActive = galleryList[this.state.currentSlide],
                    newPrevious = galleryList[destinationSlide - 1],
                    newNext = galleryList[destinationSlide + 1],
                    newActive = galleryList[destinationSlide];

                if (destinationSlide < 1) {
                    this.state.currentSlide = 1;
                    return 1;
                }

                if (destinationSlide > galleryList.length - 1 || destinationSlide === this.state.currentSlide) {
                    return this.state.currentSlide;
                }

                // Clean Previous structure
                oldPrevious.replaceClass(selector.galleryPreviousItem, selector.collapsedItem);
                if (typeof oldNext !== "undefined") oldNext.replaceClass(selector.galleryNextItem, selector.collapsedItem);
                oldActive.replaceClass(selector.active, selector.collapsedItem);

                // Lazy lazy load
                if (destinationSlide > 1 && destinationSlide < galleryList.length - 1) {
                    newPrevious.querySelector('.' + selector.galleryImage).setAttribute("loading", "eager");
                    newNext.querySelector('.' + selector.galleryImage).setAttribute("loading", "eager");
                    newActive.querySelector('.' + selector.galleryImage).setAttribute("loading", "eager");
                }

                //Build new structure
                newPrevious.replaceClass(selector.collapsedItem, selector.galleryPreviousItem);
                if (typeof newNext !== "undefined") newNext.replaceClass(selector.collapsedItem, selector.galleryNextItem);
                newActive.replaceClass(selector.collapsedItem, selector.active);

                this._slideThumbs(destinationSlide - 1);
                this.state.currentSlide = destinationSlide;

                //Check for more images
                if( this.state.slidesNumber - this.state.currentSlide < this.options.preload.range){
                    this._updateGallery();
                }
            },

            /**
             * Bind Events
             */
            _bindEvents: function (galleryNode) {
                let self = this;
                galleryNode.addEventListener('click', function (e) {
                    if (hasClass(e.target, 'fg-btn-prev')) {
                        console.log("Previous step");
                        self._slideGallery(galleryNode, self.state.currentSlide - 1);
                    }
                    if (hasClass(e.target, 'fg-btn-next')) {
                        console.log("Next step");
                        self._slideGallery(galleryNode, self.state.currentSlide + 1);
                    }
                    if (hasClass(e.target, 'fg-nav-item')) {
                        console.log("Navigate to index");
                        self._slideGallery(galleryNode, Array.prototype.slice.call(self.state.navigationNodes).indexOf(e.target) + 1);
                    }
                }, false);
            },

            _initState(element, images) {
                this.state.galleryNode = element;
                this.state.galleryListNode = element.querySelector("." + this.options.selectors.galleryList);
                this.state.navigationListNode = element.querySelector("." + this.options.selectors.navListClass);
            },

            /**
             * Prepare gallery
             */
            _createGallery: function (element) {
                let self = this;
                // Load data and build HTML
                self._galleryData(self._galleryUrl(self.options.tags))
                    .then(images => {
                        // Create gallery
                        self._prepareInnerHtml(element, images);
                        self._initState(element, images);
                        self._addImages(images);

                        //Bind active elements events
                        self._bindEvents(element);

                        //Complete Decoration class
                        element.classList.add(this.options.classToComplete);
                    });
            },

            /**
             * Update Gallery
             */

            _updateGallery: function () {
                let self = this;
                self.state.page++;

                self._galleryData(self._galleryUrl(self.options.tags))
                    .then(images => {
                        self._addImages(images);
                    });
            }
        };
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
     * Helper to check class name
     * @param {Element} elem Dom Element object
     * @param {String} className
     * @private
     */
    const hasClass = function (elem, className) {
        return elem.className.split(' ').indexOf(className) > -1;
    };

    /**
     * Helper to replace class name
     * @private
     */
    Element.prototype.replaceClass = function (removeClass, addClass) {
        this.classList.remove(removeClass);
        this.classList.add(addClass);
        return this;
    };

    /**
     * Helper to add class name
     * @private
     */
    Element.prototype.addClass = function (addClass) {
        this.classList.add(addClass);
        return this;
    };

    /**
     * Helper to remove class name
     * @private
     */
    Element.prototype.removeClass = function (removeClass) {
        this.classList.remove(removeClass);
        return this;
    };

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
            let self = this;

            // find all matching DOM elements and create separate instance for every.
            document.querySelectorAll(self.options.gallerySelector).forEach(function (element) {
                let newGallery = Object.assign(new gallery, {options: self.options});
                // Decoration class
                element.addClass(self.options.classToAdd);

                newGallery.state.galleryNode = element;
                newGallery._createGallery(element);
            });
        },

        // #! init
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
//     gallerySelector: ".my-gallery",
//     apiKey: "d730e1b0b485148747900002e7da1d08",
//     tags: 'dogs'
// })

//// access public plugin methods
// flickrGallery.publicMethod("Doing Something")
