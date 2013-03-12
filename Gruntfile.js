/* 
  Grunt.js
  http://gruntjs.com/

  Building appseeds
  -----------------
  > npm install -g grunt
  > npm install -g grunt-docco
  > node 
*/

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-docco');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-jslint');

  // Project configuration.
  grunt.initConfig({
    lint: {
      grunt: 'grunt.js', 
      seeds: 'appseeds.js', 
      plugins: ['plugins/backbone-seeds/backbone.seeds.js']
    },
    jshint: {
      options: { browser: true }
    },
    qunit: {
      index: ['test/test.html']
    },
    uglify: {
      seeds: {
        src: 'appseeds.js',
        dest: 'appseeds.min.js'
      },
      backbone: {
        src: 'plugins/backbone-seeds/backbone.seeds.js',
        dest: 'plugins/backbone-seeds/backbone.seeds.min.js'
      }
    },
    docco: {
      seeds: 'appseeds.js', 
      plugins: ['plugins/backbone-seeds/backbone.seeds.js']
    }
  });

  // Default task.
  grunt.registerTask('default', ['lint', 'uglify', 'qunit', 'docco']);

};