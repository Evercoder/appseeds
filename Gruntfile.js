/* 
  Grunt.js
  http://gruntjs.com/
*/

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-docco');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  // grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-jslint');

  // Project configuration.
  grunt.initConfig({
    jslint: {
      files: ['grunt.js','appseeds.js', 'plugins/backbone-seeds/backbone.seeds.js'],
      directives: { vars: true, white: true, sloppy: true, plusplus: true, 
        bitwise: true, nomen: true, todo: true, forin: true, browser: true }
    },
    qunit: {
      index: ['test/test.html']
    },
    uglify: {
      seeds: {
        src: 'appseeds.js',
        dest: 'appseeds.min.js'
      },
      plugins: {
        src: 'plugins/backbone-seeds/backbone.seeds.js',
        dest: 'plugins/backbone-seeds/backbone.seeds.min.js'
      }
    },

    /* Docco task */
    docco: {

      /* main appseeds file */
      seeds: {
        src: ['appseeds.js'],
        options: {
          output: 'docs/'
        }
      },

      /* plugin files */
      plugins: {
        src: ['plugins/**/*.js'],
        options: {
          output: 'docs/'
        }
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['jslint'/*, 'qunit'*/ ,'uglify', 'docco']);

};