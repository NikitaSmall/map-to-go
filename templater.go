package main

import (
	"github.com/gin-gonic/gin"
	"github.com/yosssi/ace"
	"html/template"
)

func SetupTemplates(router *gin.Engine) {
	tmp := ParseTemplate("index", "", nil)
	router.SetHTMLTemplate(tmp)
}

func ParseTemplate(base, inner string, data interface{}) *template.Template {
	tmp, err := ace.Load("templates/"+base, inner, nil)

	if err != nil {
		panic(err)
	}

	return tmp
}

func TemplateFullPath(base, inner string) string {
	return "templates/" + base + ":" + inner
}
