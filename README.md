# slider
Slider plugin


### Dependencies

Make sure you have got Node.Js and Gulp installed globally.
They should be installed first.

- [Node.js](http://nodejs.org)
- [Gulp Command Line Utility](http://gulpjs.com) `npm install --global gulp-cli`

### Quick Start

1. Run in project folder `npm install` 
3. Run one of the task runners to:
	- `gulp` manually compiles files.
	- `gulp watch` automatically compiles files and applies changes using [BrowserSync](https://browsersync.io/) when you make changes to your source files.

**Try it out.** After installing, run `gulp` to compile some test files into the `dist` directory. Or, run `gulp watch` and make some changes to see them recompile automatically.

Add empty div with "my-gallery" class name
```html
<div class="my-gallery"></div>
```

create new Plugin instance

```html
<script>
     let flickrGallery = new flickrGallerySlider({
        gallerySelector: ".my-gallery",
        apiKey: "d730e1b0b485148747900002e7da1d08",
         tags: 'dogs'
    })
</script>
```

access public plugin methods
```js
flickrGallery.extraClass("custom-class");
```
