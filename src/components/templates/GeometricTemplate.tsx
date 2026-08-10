
import React from 'react';
import { ResumeData, TemplateProps } from '../../types';
import { Mail, Phone, MapPin, Linkedin, Globe } from 'lucide-react';
import InlineEdit from '../InlineEdit';
import { inkOn, readableAccent } from '../../utils/templateInk';

export const GeometricTemplate: React.FC<TemplateProps> = ({ resume, themeColor, titleFont, bodyFont, onFocus }) => {
  const { personalDetails, professionalSummary, employmentHistory, education, skills, websites } = resume;
  
  const titleStyle = { fontFamily: `'${titleFont}', sans-serif` };
  const bodyStyle = { fontFamily: `'${bodyFont}', sans-serif` };

  return (
    <div className="bg-gray-100 text-gray-800" style={bodyStyle}>
      <div className="bg-white p-8">
        <header className="relative flex items-center justify-between pb-8">
          <div className="z-10">
            <div className="flex gap-2">
                <InlineEdit 
                    value={personalDetails.firstName} 
                    fieldId="personalDetails.firstName" 
                    onFocus={onFocus} 
                    className="text-5xl font-extrabold" 
                    style={titleStyle}
                    tagName="h1"
                    placeholder="First Name"
                />
                <InlineEdit 
                    value={personalDetails.lastName} 
                    fieldId="personalDetails.lastName" 
                    onFocus={onFocus} 
                    className="text-5xl font-extrabold" 
                    style={titleStyle}
                    tagName="h1"
                    placeholder="Last Name"
                />
            </div>
            <InlineEdit 
                value={personalDetails.jobTitle} 
                fieldId="personalDetails.jobTitle" 
                onFocus={onFocus} 
                className="text-xl font-light mt-2 block" 
                style={{...titleStyle, color: readableAccent(themeColor)}}
                tagName="p"
                placeholder="Job Title"
            />
          </div>
          <div className="absolute top-0 right-0 h-40 w-40 clip-poly-triangle z-0" style={{backgroundColor: themeColor, color: inkOn(themeColor)}}></div>
           <div className="absolute -top-4 -right-4 h-24 w-24 border-4 border-gray-800 z-0"></div>
          <style>{`.clip-poly-triangle { clip-path: polygon(0 0, 100% 0, 100% 100%); }`}</style>
        </header>
        
        <div className="grid grid-cols-12 gap-8">
            <main className="col-span-8">
                <section className="mb-6">
                    <InlineEdit 
                        value={professionalSummary} 
                        fieldId="professionalSummary" 
                        onFocus={onFocus} 
                        className="text-sm leading-relaxed block whitespace-pre-wrap"
                        tagName="p"
                        placeholder="Summary..."
                    />
                </section>
                 <section>
                    <h2 className="text-lg font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Experience</h2>
                    {employmentHistory.map((job, index) => (
                    <div key={job.id} className="mb-5 border-l-4 border-gray-800 pl-4">
                        <div className="flex gap-1 text-xs text-gray-600">
                            <InlineEdit value={job.startDate} fieldId={`employmentHistory[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                            <span>-</span>
                            <InlineEdit value={job.endDate} fieldId={`employmentHistory[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                        </div>
                        <InlineEdit 
                            value={job.jobTitle} 
                            fieldId={`employmentHistory[${index}].jobTitle`} 
                            onFocus={onFocus} 
                            className="text-lg font-semibold block" 
                            style={titleStyle}
                            tagName="h4"
                            placeholder="Job Title"
                        />
                        <div className="flex gap-1 text-md font-medium text-gray-700">
                            <InlineEdit value={job.employer} fieldId={`employmentHistory[${index}].employer`} onFocus={onFocus} placeholder="Employer" />
                            <span>,</span>
                            <InlineEdit value={job.city} fieldId={`employmentHistory[${index}].city`} onFocus={onFocus} placeholder="City" />
                        </div>
                        <InlineEdit 
                            value={job.description} 
                            fieldId={`employmentHistory[${index}].description`} 
                            onFocus={onFocus} 
                            className="text-sm mt-2 leading-relaxed whitespace-pre-wrap block"
                            tagName="p"
                            placeholder="Description..."
                        />
                    </div>
                    ))}
                </section>
            </main>
            <aside className="col-span-4">
                 <section className="mb-6">
                    <h3 className="text-lg font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Contact</h3>
                    <div className="space-y-2 text-sm">
                        {personalDetails.email && <div className="flex items-center"><Mail size={14} className="mr-2 transform translate-y-px" /><InlineEdit value={personalDetails.email} fieldId="personalDetails.email" onFocus={onFocus} placeholder="Email" /></div>}
                        {personalDetails.phone && <div className="flex items-center"><Phone size={14} className="mr-2 transform translate-y-px" /><InlineEdit value={personalDetails.phone} fieldId="personalDetails.phone" onFocus={onFocus} placeholder="Phone" /></div>}
                    </div>
                </section>
                 <section className="mb-6">
                    <h3 className="text-lg font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Skills</h3>
                    <div className="flex flex-wrap gap-2">
                    {skills.map((skill, index) => (
                        <span key={skill.id} className="inline-flex items-center text-xs bg-gray-800 text-white font-semibold px-3 py-1">
                            <InlineEdit value={skill.name} fieldId={`skills[${index}].name`} onFocus={onFocus} placeholder="Skill" />
                        </span>
                    ))}
                    </div>
                </section>
                <section className="mb-6">
                    <h3 className="text-lg font-bold uppercase tracking-wider mb-3" style={{...titleStyle, color: readableAccent(themeColor)}}>Education</h3>
                    {education.map((edu, index) => (
                    <div key={edu.id} className="mb-4">
                        <InlineEdit 
                            value={edu.degree} 
                            fieldId={`education[${index}].degree`} 
                            onFocus={onFocus} 
                            className="text-md font-semibold block" 
                            style={titleStyle}
                            tagName="h4"
                            placeholder="Degree"
                        />
                        <InlineEdit 
                            value={edu.school} 
                            fieldId={`education[${index}].school`} 
                            onFocus={onFocus} 
                            className="text-sm block" 
                            tagName="p"
                            placeholder="School"
                        />
                        <div className="flex gap-1 text-xs text-gray-600">
                            <InlineEdit value={edu.startDate} fieldId={`education[${index}].startDate`} onFocus={onFocus} placeholder="Start" />
                            <span>-</span>
                            <InlineEdit value={edu.endDate} fieldId={`education[${index}].endDate`} onFocus={onFocus} placeholder="End" />
                        </div>
                    </div>
                    ))}
                </section>
            </aside>
        </div>
      </div>
    </div>
  );
};
