package config

import (
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/gin-gonic/gin"
	"github.com/nikitasmall/map-to-go/Godeps/_workspace/src/github.com/yosssi/ace"
	"html/template"
	"log"
)

// function that takes gin.Engine router and
// set to serve static files to it
func SetupStaticFiles(router *gin.Engine) {
	router.Static("/public", "./public")
}

// function that takes gin.Engine router and
// set to serve an ACE template
// router can serve only one template at a time
// so this is a weak point (hardcoded template name)
func SetupTemplates(router *gin.Engine, relativePath string) {
	tmp := parseTemplate(relativePath, "index", "", nil)
	router.SetHTMLTemplate(tmp)
}

// function loads ACE template with provided name
func parseTemplate(relativePath, base, inner string, data *ace.Options) *template.Template {
	tmp, err := ace.Load(relativePath+base, inner, data)

	if err != nil {
		log.Panic("Error on ace template parcing! ", err.Error())
	}

	return tmp
}

// function returns full name of template
// with relative path and delimeter
// (specific for ACE)
func TemplateFullPath(relativePath, base string) string {
	return relativePath + base + ":"
}
