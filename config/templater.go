package config

import (
	"github.com/gin-gonic/gin"
	"github.com/yosssi/ace"
	"html/template"
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
func SetupTemplates(router *gin.Engine) {
	tmp := parseTemplate("index", "", nil)
	router.SetHTMLTemplate(tmp)
}

// function loads ACE template with provided name
func parseTemplate(base, inner string, data *ace.Options) *template.Template {
	tmp, err := ace.Load("templates/"+base, inner, data)

	if err != nil {
		panic(err)
	}

	return tmp
}

// function returns full name of template
// with relative path and delimeter
// (specific for ACE)
func TemplateFullPath(base, inner string) string {
	return "templates/" + base + ":" + inner
}
