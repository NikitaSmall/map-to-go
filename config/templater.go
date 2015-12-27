package config

import (
	"github.com/gin-gonic/gin"
	"github.com/yosssi/ace"
	"html/template"
)

func SetupStaticFiles(router *gin.Engine) {
	router.Static("/public", "./public")
}

func SetupTemplates(router *gin.Engine) {
	tmp := parseTemplate("index", "", nil)
	router.SetHTMLTemplate(tmp)
}

func parseTemplate(base, inner string, data *ace.Options) *template.Template {
	tmp, err := ace.Load("templates/"+base, inner, data)

	if err != nil {
		panic(err)
	}

	return tmp
}

func TemplateFullPath(base, inner string) string {
	return "templates/" + base + ":" + inner
}